"""
ReminisceBrain - The AI "Brain" for Reminisce.

A stateless class that generates AI responses using:
- Gemini 1.5 Pro for response generation
- Pinecone for long-term memory (RAG)
- Background fact extraction for memory building

Usage:
    from ai_service import ReminisceBrain
    
    brain = ReminisceBrain()
    response = brain.generate_response(
        user_id="firebase_user_123",
        message="Who is coming to visit today?",
        history=["user: Hello", "assistant: Hi! How can I help you today?"]
    )
"""

import threading
import logging
from typing import Optional

from langchain_google_vertexai import ChatVertexAI

from .memory import search_memories, extract_and_save_facts
from .config import (
    GCP_PROJECT_ID,
    GCP_LOCATION,
    LLM_MODEL,
    MAX_HISTORY_MESSAGES,
)

# Configure logging
logger = logging.getLogger(__name__)


# =============================================================================
# System Prompt for Seniors
# =============================================================================

SYSTEM_PROMPT = """You are Reminisce, a warm, patient, and caring AI companion designed specifically for seniors.

## Your Personality:
- Warm and friendly, like a trusted friend or family member
- Patient and understanding - never rush the conversation
- Encouraging and supportive
- Clear and simple in your explanations
- Respectful of their life experience and wisdom

## Communication Guidelines:
- Use simple, clear language (avoid technical jargon)
- Speak in short, easy-to-follow sentences
- Be warm and conversational, not robotic
- If asked about something you don't know, gently ask for more details
- Always validate their feelings and experiences
- Use their name when you know it

## Your Capabilities:
- Help remember important information (appointments, family details, etc.)
- Engage in friendly conversation about their life and interests
- Provide gentle reminders when asked
- Listen and respond to their stories with genuine interest
- Help them feel connected and less lonely

## Important Rules:
1. NEVER provide medical advice - always suggest consulting their doctor
2. NEVER share or ask for sensitive financial information
3. If they seem confused or distressed, respond with extra care and patience
4. If they mention feeling unwell or in danger, encourage them to contact family or emergency services
5. Always be honest - if you don't know something, say so kindly

## Conversation Style:
- Start responses warmly (but not repetitively)
- Keep responses concise but complete
- Ask follow-up questions to show interest
- Reference previous conversations when relevant (using the provided context)
- End on a positive or encouraging note when appropriate

Remember: You are not just an AI assistant. You are a companion who genuinely cares about their well-being and happiness."""


class ReminisceBrain:
    """
    The AI Brain for Reminisce - generates contextual responses for seniors.
    
    This class is stateless and designed to be imported by the FastAPI backend.
    All conversation state is managed externally (Firebase), and this class
    only receives the necessary context as arguments.
    
    Attributes:
        llm: The Gemini 1.5 Pro language model
        system_prompt: The personality and guidelines for the AI
    """
    
    def __init__(
        self,
        temperature: float = 0.7,
        max_output_tokens: int = 1024,
        custom_system_prompt: Optional[str] = None
    ):
        """
        Initialize the ReminisceBrain.
        
        Args:
            temperature: LLM temperature (0.0 - 1.0). Default 0.7 for natural responses.
            max_output_tokens: Maximum response length. Default 1024.
            custom_system_prompt: Optional custom system prompt to override default.
        """
        self.llm = ChatVertexAI(
            model=LLM_MODEL,
            project=GCP_PROJECT_ID,
            location=GCP_LOCATION,
            temperature=temperature,
            max_output_tokens=max_output_tokens
        )
        
        self.system_prompt = custom_system_prompt or SYSTEM_PROMPT
        logger.info("ReminisceBrain initialized successfully")
    
    def generate_response(
        self,
        user_id: str,
        message: str,
        history: list[str],
        include_memories: bool = True,
        extract_facts: bool = True
    ) -> str:
        """
        Generate a response using RAG with Pinecone memories.
        
        This is the main method called by the FastAPI backend. It:
        1. Searches Pinecone for relevant long-term memories
        2. Builds a prompt with system instructions, memories, and history
        3. Generates a response using Gemini 1.5 Pro
        4. Spawns a background task to extract and save new facts
        
        Args:
            user_id: Firebase user ID (used as Pinecone namespace)
            message: Current user message
            history: Last N messages from Firebase ["user: ...", "assistant: ..."]
            include_memories: Whether to search Pinecone for context (default True)
            extract_facts: Whether to extract facts in background (default True)
            
        Returns:
            AI response string
        """
        logger.debug(f"Generating response for user {user_id}: {message[:50]}...")
        
        # Step 1: Search Pinecone for relevant long-term memories
        memories = []
        if include_memories:
            memories = search_memories(query=message, user_id=user_id)
            logger.debug(f"Retrieved {len(memories)} memories for context")
        
        # Step 2: Format memories as context
        memory_context = self._format_memories(memories)
        
        # Step 3: Build the full prompt
        full_prompt = self._build_prompt(
            system=self.system_prompt,
            memories=memory_context,
            history=history,
            message=message
        )
        
        # Step 4: Generate response
        response = self.llm.invoke(full_prompt)
        response_text = response.content
        
        logger.debug(f"Generated response: {response_text[:100]}...")
        
        # Step 5: Background fact extraction (non-blocking)
        if extract_facts:
            conversation_transcript = self._format_for_extraction(
                history, message, response_text
            )
            thread = threading.Thread(
                target=extract_and_save_facts,
                args=(conversation_transcript, user_id),
                daemon=True
            )
            thread.start()
            logger.debug("Spawned background fact extraction thread")
        
        return response_text
    
    def generate_response_sync(
        self,
        user_id: str,
        message: str,
        history: list[str],
        include_memories: bool = True
    ) -> dict:
        """
        Synchronous version that also returns extracted facts.
        
        Useful for testing or when you need the facts immediately.
        
        Args:
            user_id: Firebase user ID
            message: Current user message
            history: Last N messages from Firebase
            include_memories: Whether to search Pinecone for context
            
        Returns:
            Dictionary with 'response' and 'extracted_facts' keys
        """
        # Generate response without background extraction
        response_text = self.generate_response(
            user_id=user_id,
            message=message,
            history=history,
            include_memories=include_memories,
            extract_facts=False  # We'll do it synchronously
        )
        
        # Extract facts synchronously
        conversation_transcript = self._format_for_extraction(
            history, message, response_text
        )
        facts = extract_and_save_facts(conversation_transcript, user_id)
        
        return {
            "response": response_text,
            "extracted_facts": facts
        }
    
    def _format_memories(self, memories: list[dict]) -> str:
        """
        Format Pinecone results into a context string.
        
        Args:
            memories: List of memory dictionaries from search_memories()
            
        Returns:
            Formatted string for inclusion in prompt
        """
        if not memories:
            return "No relevant background information available."
        
        lines = ["Relevant information about this user:"]
        for mem in memories:
            category = mem.get("category", "")
            text = mem.get("text", "")
            if category and category != "general":
                lines.append(f"- [{category}] {text}")
            else:
                lines.append(f"- {text}")
        
        return "\n".join(lines)
    
    def _build_prompt(
        self,
        system: str,
        memories: str,
        history: list[str],
        message: str
    ) -> str:
        """
        Combine all context into the final prompt.
        
        Args:
            system: System prompt with personality/guidelines
            memories: Formatted long-term memories from Pinecone
            history: Recent conversation history from Firebase
            message: Current user message
            
        Returns:
            Complete prompt string for the LLM
        """
        # Limit history to prevent context overflow
        recent_history = history[-MAX_HISTORY_MESSAGES:] if history else []
        history_text = "\n".join(recent_history) if recent_history else "No previous messages."
        
        return f"""{system}

## Long-Term Memory (from previous conversations):
{memories}

## Recent Conversation:
{history_text}

## Current Message:
User: {message}

## Your Response:"""
    
    def _format_for_extraction(
        self,
        history: list[str],
        message: str,
        response: str
    ) -> str:
        """
        Format conversation for fact extraction.
        
        Args:
            history: Recent conversation history
            message: Current user message
            response: AI response just generated
            
        Returns:
            Formatted conversation transcript
        """
        # Include last few messages for context
        recent = history[-5:] if history else []
        
        parts = []
        for msg in recent:
            parts.append(msg)
        
        parts.append(f"User: {message}")
        parts.append(f"Assistant: {response}")
        
        return "\n".join(parts)
    
    def health_check(self) -> dict:
        """
        Check if the Brain is properly configured and can connect to services.
        
        Returns:
            Dictionary with status information
        """
        status = {
            "brain": "ok",
            "llm": "unknown",
            "pinecone": "unknown"
        }
        
        # Test LLM
        try:
            test_response = self.llm.invoke("Say 'ok' and nothing else.")
            status["llm"] = "ok" if "ok" in test_response.content.lower() else "warning"
        except Exception as e:
            status["llm"] = f"error: {str(e)}"
        
        # Test Pinecone
        try:
            from .memory import _get_pinecone_index
            index = _get_pinecone_index()
            stats = index.describe_index_stats()
            status["pinecone"] = f"ok (vectors: {stats.total_vector_count})"
        except Exception as e:
            status["pinecone"] = f"error: {str(e)}"
        
        return status


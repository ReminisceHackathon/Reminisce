"""
Memory Extraction Service for Reminisce.

Extracts temporal events and memories from conversations, such as:
- "My daughter is visiting next week"
- "I have a doctor's appointment on Tuesday"
- "My grandson's birthday is December 25th"

Converts natural language dates to actual datetime objects and stores them
with the appropriate reminder dates.
"""

import logging
import re
import json
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List, Tuple

from langchain_google_vertexai import ChatVertexAI

from app.config import GCP_PROJECT_ID, GCP_LOCATION

logger = logging.getLogger(__name__)

# =============================================================================
# Date Parsing Utilities
# =============================================================================

WEEKDAYS = {
    "monday": 0, "tuesday": 1, "wednesday": 2, "thursday": 3,
    "friday": 4, "saturday": 5, "sunday": 6
}

MONTHS = {
    "january": 1, "february": 2, "march": 3, "april": 4,
    "may": 5, "june": 6, "july": 7, "august": 8,
    "september": 9, "october": 10, "november": 11, "december": 12,
    "jan": 1, "feb": 2, "mar": 3, "apr": 4,
    "jun": 6, "jul": 7, "aug": 8, "sep": 9, "sept": 9,
    "oct": 10, "nov": 11, "dec": 12
}


def parse_time(text: str) -> tuple:
    """
    Parse time from text like "2pm", "3:30 PM", "at 14:00".
    Returns (hour, minute) tuple or (None, None) if not found.
    """
    text_lower = text.lower()
    
    # Match patterns like "2pm", "2 pm", "2:30pm", "2:30 pm"
    time_match = re.search(r'(\d{1,2})(?::(\d{2}))?\s*(am|pm)', text_lower)
    if time_match:
        hour = int(time_match.group(1))
        minute = int(time_match.group(2)) if time_match.group(2) else 0
        period = time_match.group(3)
        
        if period == 'pm' and hour != 12:
            hour += 12
        elif period == 'am' and hour == 12:
            hour = 0
        
        return (hour, minute)
    
    # Match 24-hour format like "14:00" or "at 14:00"
    time_24_match = re.search(r'(?:at\s+)?(\d{1,2}):(\d{2})(?!\s*(am|pm))', text_lower)
    if time_24_match:
        hour = int(time_24_match.group(1))
        minute = int(time_24_match.group(2))
        if 0 <= hour <= 23:
            return (hour, minute)
    
    return (None, None)


def parse_relative_date(text: str, reference_date: Optional[datetime] = None) -> Optional[datetime]:
    """
    Parse relative date expressions like "next week", "tomorrow", "on Tuesday".
    Also parses time if present (e.g., "tomorrow at 2pm").
    
    Args:
        text: The text containing date references
        reference_date: The reference date (defaults to today)
        
    Returns:
        datetime object or None if no date found
    """
    if reference_date is None:
        reference_date = datetime.utcnow()
    
    text_lower = text.lower()
    
    # Parse time from the text
    hour, minute = parse_time(text)
    
    def apply_time(date_obj):
        """Apply parsed time to a date, or use default (9 AM)."""
        if hour is not None:
            return date_obj.replace(hour=hour, minute=minute, second=0, microsecond=0)
        return date_obj.replace(hour=9, minute=0, second=0, microsecond=0)  # Default 9 AM
    
    # Today
    if "today" in text_lower:
        return apply_time(reference_date)
    
    # Tomorrow
    if "tomorrow" in text_lower:
        return apply_time(reference_date + timedelta(days=1))
    
    # Next week (assume 7 days from now)
    if "next week" in text_lower:
        return apply_time(reference_date + timedelta(days=7))
    
    # This week (assume within 7 days)
    if "this week" in text_lower:
        return apply_time(reference_date + timedelta(days=3))  # Midweek estimate
    
    # In X days
    days_match = re.search(r'in\s+(\d+)\s+days?', text_lower)
    if days_match:
        days = int(days_match.group(1))
        return apply_time(reference_date + timedelta(days=days))
    
    # In X weeks
    weeks_match = re.search(r'in\s+(\d+)\s+weeks?', text_lower)
    if weeks_match:
        weeks = int(weeks_match.group(1))
        return apply_time(reference_date + timedelta(weeks=weeks))
    
    # Next [weekday]
    for day_name, day_num in WEEKDAYS.items():
        if f"next {day_name}" in text_lower:
            current_day = reference_date.weekday()
            days_ahead = day_num - current_day
            if days_ahead <= 0:
                days_ahead += 7
            days_ahead += 7  # "Next" means following week
            return apply_time(reference_date + timedelta(days=days_ahead))
    
    # On [weekday] or this [weekday]
    for day_name, day_num in WEEKDAYS.items():
        if f"on {day_name}" in text_lower or f"this {day_name}" in text_lower or day_name in text_lower:
            current_day = reference_date.weekday()
            days_ahead = day_num - current_day
            if days_ahead < 0:
                days_ahead += 7
            if days_ahead == 0:
                days_ahead = 7  # Same day means next week
            return apply_time(reference_date + timedelta(days=days_ahead))
    
    # [Month] [day] or [Month] [day]th/st/nd/rd
    for month_name, month_num in MONTHS.items():
        pattern = rf'{month_name}\s+(\d{{1,2}})(?:st|nd|rd|th)?'
        match = re.search(pattern, text_lower)
        if match:
            day = int(match.group(1))
            year = reference_date.year
            try:
                target_date = datetime(year, month_num, day)
                # If date has passed, assume next year
                if target_date < reference_date:
                    target_date = datetime(year + 1, month_num, day)
                return apply_time(target_date)
            except ValueError:
                continue
    
    # MM/DD or MM-DD format
    date_match = re.search(r'(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?', text_lower)
    if date_match:
        month = int(date_match.group(1))
        day = int(date_match.group(2))
        year = reference_date.year
        if date_match.group(3):
            year = int(date_match.group(3))
            if year < 100:
                year += 2000
        try:
            target_date = datetime(year, month, day)
            target_date = apply_time(target_date)
            if target_date < reference_date:
                target_date = apply_time(datetime(year + 1, month, day))
            return target_date
        except ValueError:
            pass
    
    return None


# =============================================================================
# AI-Powered Event Extraction
# =============================================================================

EXTRACTION_PROMPT = """Analyze this conversation and extract any events or facts that have a specific date or time associated with them.

Focus on:
- Upcoming visits from family/friends
- Appointments (doctor, dentist, etc.)
- Birthdays, anniversaries, holidays
- Scheduled activities or plans
- Recurring events mentioned

For each event found, provide:
1. A clear description of the event
2. The time reference as mentioned (e.g., "next week", "on Tuesday", "December 25th")
3. Category: visit, appointment, birthday, anniversary, activity, or other
4. Who is involved (if mentioned)

Rules:
- Only extract events with clear temporal references
- Be specific about what will happen
- If no dated events exist, return an empty array

Return as JSON array ONLY (no markdown, no explanation):
[{{"event": "...", "time_reference": "...", "category": "...", "people": ["..."]}}]

Return [] if no dated events found.

Conversation:
{conversation}"""


def extract_events_with_ai(conversation: str) -> List[Dict[str, Any]]:
    """
    Use Gemini to extract events with dates from conversation.
    
    Args:
        conversation: The conversation text
        
    Returns:
        List of extracted events with their time references
    """
    try:
        llm = ChatVertexAI(
            model="gemini-2.0-flash-001",
            project=GCP_PROJECT_ID,
            location=GCP_LOCATION,
            temperature=0.1,
            max_output_tokens=1024
        )
        
        prompt = EXTRACTION_PROMPT.format(conversation=conversation)
        response = llm.invoke(prompt)
        
        response_text = response.content.strip()
        
        # Handle markdown code blocks
        if response_text.startswith("```"):
            lines = response_text.split("\n")
            response_text = "\n".join(lines[1:-1])
        
        events = json.loads(response_text)
        
        if not isinstance(events, list):
            return []
        
        return events
        
    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse AI response: {e}")
        return []
    except Exception as e:
        logger.error(f"Error extracting events: {e}")
        return []


# =============================================================================
# Main Extraction Function
# =============================================================================

def extract_memories_from_conversation(
    message: str,
    response: str,
    history: Optional[List[str]] = None,
    user_id: Optional[str] = None
) -> List[Dict[str, Any]]:
    """
    Extract memories and dated events from a conversation.
    
    This is the main function called after each conversation turn.
    It combines pattern matching for common phrases with AI extraction
    for more complex cases.
    
    Args:
        message: The user's message
        response: The AI's response
        history: Previous conversation history
        user_id: The user's ID (for logging)
        
    Returns:
        List of extracted memories with:
        - text: Description of the memory/event
        - category: Type of memory
        - event_date: datetime when event occurs (if applicable)
        - reminder_date: datetime when to remind (if applicable)
        - source_message: The original message
    """
    # Combine context
    full_context = message + " " + response
    if history:
        full_context = " ".join(history[-4:]) + " " + full_context
    
    extracted_memories = []
    
    # Quick pattern check - does this look like it contains temporal info?
    temporal_keywords = [
        "tomorrow", "next week", "next month", "today",
        "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday",
        "january", "february", "march", "april", "may", "june",
        "july", "august", "september", "october", "november", "december",
        "visiting", "visit", "coming", "appointment", "birthday", "anniversary",
        "in a week", "in two weeks", "this week", "this weekend"
    ]
    
    has_temporal = any(kw in full_context.lower() for kw in temporal_keywords)
    
    if not has_temporal:
        logger.debug("No temporal keywords found, skipping extraction")
        return []
    
    # Use AI extraction for comprehensive analysis
    try:
        events = extract_events_with_ai(f"User: {message}\nAssistant: {response}")
        
        for event in events:
            event_text = event.get("event", "")
            time_ref = event.get("time_reference", "")
            category = event.get("category", "other")
            people = event.get("people", [])
            
            if not event_text:
                continue
            
            # Parse the time reference to an actual date
            event_date = parse_relative_date(time_ref) if time_ref else None
            
            # For visits and appointments, remind on the day of
            # For birthdays, remind the day before
            reminder_date = None
            if event_date:
                if category == "birthday" or category == "anniversary":
                    reminder_date = event_date - timedelta(days=1)
                else:
                    reminder_date = event_date
            
            # Use clean event text (without extra metadata)
            memory_text = event_text
            
            extracted_memories.append({
                "text": memory_text,
                "category": category,
                "event_date": event_date,
                "reminder_date": reminder_date,
                "source_message": message,
                "time_reference": time_ref
            })
            
            logger.info(f"Extracted memory: {memory_text[:50]}... (date: {event_date})")
        
    except Exception as e:
        logger.error(f"Error in memory extraction: {e}")
    
    return extracted_memories


# =============================================================================
# Quick Pattern-Based Extraction (Fallback)
# =============================================================================

def extract_quick_patterns(message: str) -> List[Dict[str, Any]]:
    """
    Fast pattern-based extraction for common phrases.
    Used as a quick fallback when AI extraction is not needed.
    
    Patterns like:
    - "my [person] is visiting [time]"
    - "I have a [type] appointment [time]"
    """
    patterns = [
        # Visiting patterns
        (
            r"(?:my\s+)?(\w+)(?:'s)?\s+(?:is\s+)?(?:coming|visiting|going to visit)\s+(?:me\s+)?(.+)",
            "visit"
        ),
        # Appointment patterns
        (
            r"(?:I\s+have\s+)?(?:a\s+)?(\w+)\s+appointment\s+(.+)",
            "appointment"
        ),
        # Birthday patterns
        (
            r"(?:my\s+)?(\w+)(?:'s)?\s+birthday\s+(?:is\s+)?(.+)",
            "birthday"
        ),
    ]
    
    results = []
    message_lower = message.lower()
    
    for pattern, category in patterns:
        match = re.search(pattern, message_lower)
        if match:
            subject = match.group(1).capitalize()
            time_ref = match.group(2).strip()
            event_date = parse_relative_date(time_ref)
            
            if category == "visit":
                text = f"{subject} is visiting"
            elif category == "appointment":
                text = f"{subject} appointment"
            elif category == "birthday":
                text = f"{subject}'s birthday"
            else:
                text = f"{subject} - {time_ref}"
            
            results.append({
                "text": text,
                "category": category,
                "event_date": event_date,
                "reminder_date": event_date,
                "source_message": message,
                "time_reference": time_ref
            })
    
    return results


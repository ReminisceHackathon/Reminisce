"""Setup file for editable install with older pip versions."""
from setuptools import setup, find_packages

setup(
    name="ai_service",
    version="1.0.0",
    packages=find_packages(),
    py_modules=["brain", "memory", "config", "__init__"],
    install_requires=[
        "pinecone-client>=3.0.0",
        "langchain-google-vertexai>=1.0.0",
        "google-cloud-aiplatform>=1.38.0",
        "vertexai>=1.0.0",
        "python-dotenv>=1.0.0",
    ],
)


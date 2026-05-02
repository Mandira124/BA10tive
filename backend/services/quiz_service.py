import os
import uuid
import json
import re
from typing import List
from models.schemas import VideoChunk, QuizQuestion, QuizOption


def _parse_questions_from_response(text: str, chunk: VideoChunk) -> List[QuizQuestion]:
    text = text.strip()
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\s*", "", text)
        text = re.sub(r"\s*```$", "", text.strip())

    try:
        data = json.loads(text)
    except json.JSONDecodeError:
        return []

    questions = []
    for i, q in enumerate(data.get("questions", [])):
        options_raw = q.get("options", [])
        if not options_raw or len(options_raw) < 2:
            continue

        options = [QuizOption(id=o["id"], text=o["text"]) for o in options_raw]
        trigger_time = max(chunk.end_time - 8, chunk.start_time + 5)

        question = QuizQuestion(
            id=str(uuid.uuid4()),
            chunk_id=chunk.id,
            chunk_index=chunk.index,
            question_type=q.get("type", "mcq"),
            question=q.get("question", ""),
            options=options,
            correct_answer=q.get("correct_answer", "a"),
            explanation=q.get("explanation", ""),
            trigger_time=trigger_time,
        )
        questions.append(question)

    return questions


def generate_questions_with_api(chunk: VideoChunk) -> List[QuizQuestion]:
    import anthropic

    client = anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])

    prompt = f"""You are an educational quiz designer. Your task is to create quiz questions for a segment of an educational video transcript.

Transcript segment (from {chunk.start_time:.0f}s to {chunk.end_time:.0f}s):
{chunk.text}

Generate exactly 2 quiz questions in valid JSON format. Use this exact structure:

{{
  "questions": [
    {{
      "type": "mcq",
      "question": "A clear, direct question testing comprehension of a key concept",
      "options": [
        {{"id": "a", "text": "Correct answer based on transcript"}},
        {{"id": "b", "text": "Plausible but incorrect distractor"}},
        {{"id": "c", "text": "Another plausible distractor"}},
        {{"id": "d", "text": "A clearly wrong option"}}
      ],
      "correct_answer": "a",
      "explanation": "Brief explanation of why this is correct and what the transcript says"
    }},
    {{
      "type": "attention_check",
      "question": "A specific detail question that tests whether the viewer was paying close attention",
      "options": [
        {{"id": "a", "text": "Plausible but wrong detail"}},
        {{"id": "b", "text": "The actual correct specific detail from the transcript"}},
        {{"id": "c", "text": "Another plausible but wrong option"}},
        {{"id": "d", "text": "Something obviously unrelated"}}
      ],
      "correct_answer": "b",
      "explanation": "The transcript specifically mentions this detail"
    }}
  ]
}}

Rules:
- Questions must be directly answerable from the given transcript text
- Distractors must be plausible but clearly incorrect based on the transcript
- The attention_check question should test a specific fact, name, number, or detail from the transcript
- Do not use phrases like "According to the video" or "The speaker says"
- Keep questions concise, under 25 words each
- Return only the JSON object, nothing else"""

    message = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=1200,
        messages=[{"role": "user", "content": prompt}],
    )

    response_text = message.content[0].text
    return _parse_questions_from_response(response_text, chunk)


def generate_mock_questions(chunk: VideoChunk) -> List[QuizQuestion]:
    sentences = [s.strip() for s in chunk.text.split(".") if len(s.strip()) > 30]
    topic = chunk.topic_label or "this segment"

    if len(sentences) < 2:
        sentences = [chunk.text[:100], chunk.text[100:200] or chunk.text[:100]]

    first_sentence = sentences[0] if sentences else chunk.text[:80]
    words = first_sentence.split()
    key_phrase = " ".join(words[3:8]) if len(words) > 8 else first_sentence[:40]

    trigger_time = max(chunk.end_time - 8, chunk.start_time + 5)

    q1 = QuizQuestion(
        id=str(uuid.uuid4()),
        chunk_id=chunk.id,
        chunk_index=chunk.index,
        question_type="mcq",
        question=f"What is the primary focus of this section?",
        options=[
            QuizOption(id="a", text=f"The concepts introduced around: {key_phrase[:50]}"),
            QuizOption(id="b", text="Reviewing previously covered material"),
            QuizOption(id="c", text="Providing an unrelated case study"),
            QuizOption(id="d", text="Summarizing the entire course"),
        ],
        correct_answer="a",
        explanation="This section introduces and discusses the concepts mentioned at its start. Set ANTHROPIC_API_KEY for AI-generated questions.",
        trigger_time=trigger_time,
    )

    q2 = QuizQuestion(
        id=str(uuid.uuid4()),
        chunk_id=chunk.id,
        chunk_index=chunk.index,
        question_type="attention_check",
        question=f"Which of these phrases appears in this segment?",
        options=[
            QuizOption(id="a", text="A phrase not in this segment"),
            QuizOption(id="b", text=key_phrase[:60] if key_phrase else "The key concept discussed"),
            QuizOption(id="c", text="An unrelated technical term"),
            QuizOption(id="d", text="Content from a different section"),
        ],
        correct_answer="b",
        explanation="This phrase was mentioned in the transcript. Set ANTHROPIC_API_KEY for real AI-generated attention checks.",
        trigger_time=trigger_time,
    )

    return [q1, q2]


def generate_questions_for_chunk(chunk: VideoChunk) -> List[QuizQuestion]:
    api_key = os.environ.get("ANTHROPIC_API_KEY", "").strip()
    if api_key and api_key != "your_anthropic_api_key_here":
        try:
            questions = generate_questions_with_api(chunk)
            if questions:
                return questions
        except Exception as e:
            print(f"API question generation failed for chunk {chunk.index}: {e}")

    return generate_mock_questions(chunk)

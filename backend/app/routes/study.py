import json
from fastapi import APIRouter, HTTPException
from app.database import get_supabase
from app.models import LectureSaveRequest, LectureAnalyzeRequest
from app.config import OPENAI_API_KEY

router = APIRouter(prefix="/study", tags=["study"])


@router.post("/analyze")
async def analyze_lecture(data: LectureAnalyzeRequest):
    if not data.transcript.strip():
        raise HTTPException(status_code=400, detail="Текст лекции пуст")

    if not OPENAI_API_KEY:
        # Временная заглушка, если ключ не настроен
        return {
            "summary": "Это демонстрационная сводка лекции (ключ OpenAI не настроен). В реальном режиме здесь будет сгенерирован ИИ-конспект лекции.",
            "highlights": [
                "Важный момент 1: Введение в тему лекции и основные определения.",
                "Важный момент 2: Ключевой закон или тезис, разобранный профессором.",
                "Важный момент 3: Заключение и выводы по теме."
            ],
            "key_terms": [
                {"term": "Лекция", "definition": "Устное изложение учебного предмета или какой-либо темы преподавателем."},
                {"term": "Конспект", "definition": "Краткое изложение содержания статьи, книги, лекции или выступления."}
            ]
        }

    try:
        from openai import OpenAI
        client = OpenAI(api_key=OPENAI_API_KEY)
        
        prompt = (
            "Вы — профессиональный академический ассистент для глухих и слабослышащих студентов. "
            "Вам предоставлен текст лекции, расшифрованный из аудио. Ваша задача — проанализировать текст лекции, "
            "составить краткое изложение (summary), выделить ключевые цитаты или тезисы (highlights) и составить "
            "словарь ключевых терминов лекции с их определениями (key_terms).\n\n"
            "Верните результат строго в формате JSON со следующей структурой:\n"
            "{\n"
            "  \"summary\": \"краткое изложение всей лекции (3-5 предложений)\",\n"
            "  \"highlights\": [\n"
            "    \"важный момент/цитата 1\",\n"
            "    \"важный момент/цитата 2\",\n"
            "    ...\n"
            "  ],\n"
            "  \"key_terms\": [\n"
            "    {\"term\": \"Термин 1\", \"definition\": \"Краткое определение термина\"},\n"
            "    ...\n"
            "  ]\n"
            "}\n\n"
            f"Текст лекции:\n{data.transcript}"
        )
        
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "Вы — академический помощник, структурирующий текст в формат JSON."},
                {"role": "user", "content": prompt}
            ],
            response_format={"type": "json_object"},
            temperature=0.3
        )
        
        result_content = response.choices[0].message.content
        return json.loads(result_content)
        
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Ошибка анализа текста через OpenAI: {str(e)}"
        )


@router.post("/lectures")
async def save_lecture(data: LectureSaveRequest):
    db = get_supabase()
    lecture_data = data.model_dump()
    response = db.table("study_lectures").insert(lecture_data).execute()
    return response.data


@router.get("/lectures/{user_id}")
async def get_lectures(user_id: str):
    db = get_supabase()
    response = (
        db.table("study_lectures")
        .select("*")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .execute()
    )
    return response.data


@router.delete("/lectures/{lecture_id}")
async def delete_lecture(lecture_id: str):
    db = get_supabase()
    response = (
        db.table("study_lectures")
        .delete()
        .eq("id", lecture_id)
        .execute()
    )
    return response.data

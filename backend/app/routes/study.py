import json
from fastapi import APIRouter, HTTPException, Depends
from app.database import get_supabase
from app.models import LectureSaveRequest, LectureAnalyzeRequest, LectureChatRequest
from app.config import OPENAI_API_KEY
from app.dependencies import get_current_user

router = APIRouter(prefix="/study", tags=["study"])


@router.post("/chat")
async def chat_with_lecture(data: LectureChatRequest, current_user: dict = Depends(get_current_user)):
    if not data.transcript.strip():
        raise HTTPException(status_code=400, detail="Текст лекции пуст")
    if not data.message.strip():
        raise HTTPException(status_code=400, detail="Вопрос пуст")

    if not OPENAI_API_KEY:
        # Временная заглушка, если ключ не настроен
        return {
            "response": f"Это демонстрационный ответ ИИ (ключ OpenAI не настроен). Вы спросили: '{data.message}'."
        }

    try:
        from openai import OpenAI
        if OPENAI_API_KEY.startswith("xai-"):
            client = OpenAI(api_key=OPENAI_API_KEY, base_url="https://api.x.ai/v1")
            model_name = "grok-beta"
        else:
            client = OpenAI(api_key=OPENAI_API_KEY)
            model_name = "gpt-4o-mini"
        
        system_content = (
            "Вы — профессиональный академический ассистент для глухих и слабослышащих студентов. "
            "Вам предоставлен текст лекции, расшифрованный из аудио. Ваша задача — отвечать на вопросы студента "
            "исключительно по содержанию этой лекции. Отвечайте понятно, точно и структурированно. "
            "Если ответ нельзя найти в тексте лекции, вежливо скажите, что этой информации нет в материалах.\n\n"
            f"Текст лекции:\n{data.transcript}"
        )
        
        messages = [{"role": "system", "content": system_content}]
        
        # Add history if present
        if data.history:
            for msg in data.history:
                messages.append({"role": msg.role, "content": msg.content})
                
        # Add current message
        messages.append({"role": "user", "content": data.message})
        
        response = client.chat.completions.create(
            model=model_name,
            messages=messages,
            temperature=0.5
        )
        
        result_content = response.choices[0].message.content
        return {"response": result_content}
        
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Ошибка чата через OpenAI: {str(e)}"
        )


@router.post("/analyze")
async def analyze_lecture(data: LectureAnalyzeRequest, current_user: dict = Depends(get_current_user)):
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
        if OPENAI_API_KEY.startswith("xai-"):
            client = OpenAI(api_key=OPENAI_API_KEY, base_url="https://api.x.ai/v1")
            model_name = "grok-beta"
        else:
            client = OpenAI(api_key=OPENAI_API_KEY)
            model_name = "gpt-4o-mini"
        
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
            model=model_name,
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
async def save_lecture(data: LectureSaveRequest, current_user: dict = Depends(get_current_user)):
    db = get_supabase()
    lecture_data = data.model_dump()
    lecture_data["user_id"] = current_user["id"]
    response = db.table("study_lectures").insert(lecture_data).execute()
    return response.data


@router.get("/lectures/{user_id}")
async def get_lectures(user_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["id"] != user_id:
        raise HTTPException(status_code=403, detail="Доступ запрещен")
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
async def delete_lecture(lecture_id: str, current_user: dict = Depends(get_current_user)):
    db = get_supabase()
    # Check ownership of the lecture first
    lecture = db.table("study_lectures").select("user_id").eq("id", lecture_id).execute()
    if not lecture.data:
        raise HTTPException(status_code=404, detail="Конспект не найден")
    if lecture.data[0]["user_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Доступ запрещен")

    response = (
        db.table("study_lectures")
        .delete()
        .eq("id", lecture_id)
        .execute()
    )
    return response.data


import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { name, email, message } = await req.json();

  if (!name || !email || !message) {
    return NextResponse.json({ error: "Заполните все поля" }, { status: 400 });
  }

  // Здесь можно добавить отправку email или сохранение в БД
  console.log("Contact form:", { name, email, message });

  return NextResponse.json({ success: true });
}

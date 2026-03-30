# TeldA — Контроль средней скорости

PWA-приложение для водителей. Показывает среднюю скорость между камерами на трассе Алматы ↔ Шымкент.

## Быстрый деплой на Vercel

### Вариант A: через CLI (рекомендуется)

```bash
# 1. Установи зависимости
npm install

# 2. Проверь локально
npm run dev

# 3. Деплой на Vercel
npx vercel --prod
```

### Вариант B: через GitHub

1. Создай репо на GitHub, запушь этот код
2. Зайди на vercel.com → New Project → импортируй репо
3. Framework: Vite. Всё остальное по умолчанию
4. Deploy

## После деплоя

Открой ссылку на телефоне → нажми "Добавить на главный экран" → TeldA установлена как приложение.

## DEV-режим (симулятор)

5 быстрых тапов по логотипу "TeldA" → появится кнопка симулятора.

## Структура

```
telda-pwa/
├── index.html          # Entry point
├── package.json        # Dependencies
├── vite.config.js      # Vite + PWA plugin
├── vercel.json         # Vercel SPA routing
├── public/
│   ├── icon-192.png    # PWA icon
│   └── icon-512.png    # PWA icon large
└── src/
    ├── main.jsx        # React mount
    └── App.jsx         # TeldA app (всё в одном файле)
```

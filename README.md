# Canvas Pages

Публикация файлов Obsidian `.canvas` как интерактивного сайта на GitHub Pages.
Рендеринг выполняет [`json-canvas-viewer`](https://github.com/hesprs/json-canvas-viewer)
(загружается с `https://unpkg.com/json-canvas-viewer`), поэтому в рантайме нет
сборщика и зависимостей.

## Что умеет

- Панорамирование, зум, мини-карта и элементы управления (как в Obsidian)
- Поддержка markdown в текстовых нодах
- Картинки/аудио/видео в нодах типа `file`
- Светлая и тёмная темы (запоминается в `localStorage`)
- Несколько `.canvas` файлов с переключателем и прямыми ссылками `?canvas=<slug>`

## Структура

```
canvas/          исходные .canvas файлы
attachments/     вложения (png, md, mp3, ...), вложенные папки сохраняются
index.html       разметка страницы
styles.css       стили
app.js           логика загрузки и переключения canvas
scripts/build.mjs  сборка dist/ и генерация canvases.json
scripts/serve.mjs  локальный статический сервер для dist/
dist/            результат сборки (в git не попадает)
```

## Как добавить новый canvas

1. Положите файл в `canvas/`.
2. Положите используемые вложения в `attachments/`.
3. Запустите `npm run build` (или просто сделайте push — GitHub Action соберёт сам).

`canvases.json` генерируется автоматически: `slug` — из имени файла,
`title` — имя файла. Вложения подставляются автоматически по имени файла из ноды
(значение `file` в `.canvas`), поэтому важно, чтобы имена совпадали.

## Деплой на GitHub Pages

1. Создайте репозиторий и запушьте этот проект:

   ```bash
   git init -b main
   git add .
   git commit -m "Add JSON Canvas GitHub Pages"
   git remote add origin git@github.com:<user>/<repo>.git
   git push -u origin main
   ```

2. В репозитории: **Settings → Pages → Build and deployment → Source** выберите
   **GitHub Actions**.
3. Workflow `.github/workflows/pages.yml` соберёт `dist/` и опубликует сайт.
   Адрес: `https://<user>.github.io/<repo>/`.

## Локальный запуск

```bash
npm run dev      # сборка + сервер на http://localhost:8080
```

Открыть конкретный canvas: `http://localhost:8080/?canvas=<slug>`.

## Версия библиотеки

Сейчас подключён «последний» релиз: `https://unpkg.com/json-canvas-viewer`.
Чтобы зафиксировать версию, замените URL в `app.js` на явный, например
`https://unpkg.com/json-canvas-viewer@4.3.2`.

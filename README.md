# Attentive

A YouTube learning platform that turns educational videos into active, quiz-driven experiences. The core problem it solves: passive video watching leads to poor retention. Attentive interrupts videos at natural content boundaries, checks your understanding with AI-generated questions, and gives you a structured attention report at the end.

---

## Features

- **YouTube URL input** - Paste any video link with English captions
- **Automatic transcript processing** - Fetches captions without any API key via youtube-transcript-api
- **Intelligent segmentation** - Breaks the transcript into coherent learning chunks with topic shift detection
- **AI question generation** - Uses Claude to generate comprehension and attention-check questions per segment
- **Mock fallback** - Works without an Anthropic API key using heuristic placeholder questions
- **Interactive quiz overlay** - Video pauses at checkpoints, question appears, feedback is immediate
- **Attention scoring** - Weighted formula combining correctness, response speed, and skip rate
- **Learning dashboard** - Per-section performance breakdown, weak sections highlighted, re-watch links

---

## Tech stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14 (App Router), TypeScript, Tailwind CSS |
| Backend | FastAPI, Python 3.10+ |
| Transcript | youtube-transcript-api |
| AI | Anthropic Claude (claude-sonnet-4-20250514) |
| State | React state + localStorage (no external store) |

---

## Architecture

```
attentive/
├── backend/
│   ├── main.py                     # FastAPI app entry point
│   ├── requirements.txt
│   ├── models/
│   │   └── schemas.py              # Pydantic request/response models
│   ├── routers/
│   │   ├── video.py                # POST /api/video/process
│   │   └── quiz.py                 # Session management and answer tracking
│   └── services/
│       ├── transcript_service.py   # YouTube transcript fetching + metadata
│       ├── chunking_service.py     # Transcript segmentation with topic detection
│       └── quiz_service.py         # Question generation (Claude API + mock fallback)
│
└── frontend/
    └── src/
        ├── app/
        │   ├── page.tsx            # Landing page with URL input
        │   ├── watch/page.tsx      # Video player + quiz interface
        │   └── results/page.tsx    # Attention score dashboard
        ├── components/
        │   ├── VideoPlayer.tsx     # YouTube IFrame API wrapper
        │   ├── QuizOverlay.tsx     # Question display (answering + feedback states)
        │   └── SectionSidebar.tsx  # Chapter list with progress dots
        ├── hooks/
        │   └── useQuizSession.ts   # Core quiz state machine
        └── lib/
            ├── api.ts              # Typed fetch wrappers for backend
            └── types.ts            # Shared TypeScript interfaces
```

### Request flow

1. User submits YouTube URL
2. Frontend sends `POST /api/video/process`
3. Backend fetches transcript via youtube-transcript-api
4. Chunking service segments transcript (target: 2 minutes per chunk, sentence-boundary aware)
5. For each chunk, quiz service calls Claude API to generate 2 questions (MCQ + attention check)
6. Full VideoInfo response stored in localStorage; user redirected to /watch
7. YouTube IFrame API polls current time every 500ms
8. When current time >= question trigger time, player is paused and quiz overlay renders
9. Answer submission hits `POST /api/quiz/answer`, stored in server-side session dict
10. On video end (or manual trigger), `GET /api/quiz/session/{id}/results` computes attention score

### Attention score formula

```
score = (correctness_rate * 0.65) + (time_score * 0.20) + (engagement_rate * 0.15)

correctness_rate = correct / total
time_score = max(0, 1 - (median_response_time_s - 10) / 50)
engagement_rate = 1 - (skipped / total)
```

---

## Setup

### Prerequisites

- Python 3.10 or higher
- Node.js 18 or higher
- An Anthropic API key (optional - mock questions work without one)

### Backend

```bash
cd backend

# Create and activate a virtual environment
python -m venv venv
source venv/bin/activate      # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env and add your ANTHROPIC_API_KEY (leave blank for mock questions)

# Start the server
uvicorn main:app --reload --port 8000
```

The backend will be available at `http://localhost:8000`. API docs: `http://localhost:8000/docs`.

### Frontend

```bash
cd frontend

# Install dependencies
npm install

# Configure environment
cp .env.local.example .env.local
# NEXT_PUBLIC_API_URL=http://localhost:8000 (default, change if needed)

# Start the dev server
npm run dev
```

The frontend will be available at `http://localhost:3000`.

---

## Environment variables

### Backend (`backend/.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `ANTHROPIC_API_KEY` | No | Claude API key for AI question generation. Omit to use mock questions. |
| `CORS_ORIGINS` | No | Comma-separated allowed origins. Defaults to `http://localhost:3000`. |

### Frontend (`frontend/.env.local`)

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_API_URL` | No | Backend base URL. Defaults to `http://localhost:8000`. |

---

## Usage

1. Open `http://localhost:3000`
2. Paste a YouTube video URL (the video must have English captions/subtitles enabled)
3. Click "Start learning" and wait 15-30 seconds for processing
4. The video player opens. Press play.
5. At each section boundary, the video pauses and a question appears
6. Answer or skip. Feedback is shown immediately. Press "Continue watching."
7. When the video ends, you are redirected to the results dashboard
8. You can also click "View results" in the header at any time

---

## Notes and limitations

- Only works with YouTube videos that have English transcript/caption data available
- Session data is stored in memory on the backend. Restarting the backend clears sessions.
- The processed video data (chunks + questions) is stored in localStorage. Opening the same video ID again reuses the cached data without reprocessing.
- Mock questions (without API key) are intentionally simple placeholders and do not reflect the actual video content meaningfully.
- The YouTube IFrame API requires the page to be served from a real origin (localhost works).

---

## Development

### Run backend tests

```bash
cd backend
python -m pytest
```

### Build frontend for production

```bash
cd frontend
npm run build
npm start
```

### Lint frontend

```bash
cd frontend
npm run lint
```

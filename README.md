# FastAPI + Next.js + Private S3 File Manager

No PostgreSQL. No user database. No AWS credentials in the browser.

## Configure

Edit `backend/.env` with your AWS credentials and private bucket. Keep `frontend/.env` as `NEXT_PUBLIC_API_URL=http://localhost:8000`.

## S3 CORS

Use:
```json
[{"AllowedOrigins":["http://localhost:3000"],"AllowedMethods":["GET","PUT","HEAD"],"AllowedHeaders":["*"],"ExposeHeaders":["ETag"],"MaxAgeSeconds":3000}]
```
Keep S3 Block Public Access enabled.

## Run
```bash
docker compose up -d --build
docker compose ps
docker compose logs -f backend
```
Open http://localhost:3000 and API docs at http://localhost:8000/docs.

## Flow
1. Next.js asks FastAPI for a presigned PUT URL.
2. Browser uploads directly to S3.
3. Next.js asks FastAPI for a presigned GET URL.
4. Browser views/downloads the private object temporarily.
5. Delete is performed through FastAPI.

For production on EC2/ECS/EKS, use an IAM role instead of long-lived access keys.

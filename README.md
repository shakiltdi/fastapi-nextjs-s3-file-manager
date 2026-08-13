# Secure S3 File Upload/View — FastAPI + Next.js

R&D reference implementation for a strict production pattern:

- **Only the FastAPI backend holds AWS credentials.** The Next.js client, the
  browser, and any mobile app never see an AWS access key, secret key, or
  session token.
- **The client never receives a presigned S3 URL.** Viewing a file means the
  browser calls the FastAPI backend, and the backend streams the object
  bytes back over its own HTTP response. The only host the browser ever
  talks to is your API.

## Architecture

```
                    CLIENT (Next.js)
                       │
                       │ GET /api/files/view?key=uploads/<id>.jpg
                       ▼
               ┌─────────────────┐
               │ FastAPI Backend │
               │                 │
               │ AWS credentials │
               │ available here  │  ← only place credentials exist
               └────────┬────────┘
                        │ s3_client.get_object()
                        ▼
               ┌─────────────────┐
               │   Private S3    │
               │                 │
               │ Block Public    │
               │ Access: ON      │
               └────────┬────────┘
                        │ file bytes
                        ▼
               ┌─────────────────┐
               │ FastAPI Backend │
               └────────┬────────┘
                        │ StreamingResponse (bytes, same content-type)
                        ▼
                    CLIENT (Next.js)
```

Upload follows the same shape in reverse: the browser posts the file to
FastAPI, and FastAPI is the only thing that ever calls `s3.put_object`.


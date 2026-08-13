"use client";

import { useEffect, useState } from "react";

const API =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

type Item = {
  key: string;
  size: number;
  last_modified: string;
};

export default function Home() {
  const [items, setItems] = useState<Item[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  async function load() {
    try {
      setErr("");

      const r = await fetch(`${API}/api/files`, {
        cache: "no-store",
      });

      if (!r.ok) {
        throw Error(await r.text());
      }

      setItems(await r.json());
    } catch (e) {
      setErr(
        e instanceof Error
          ? e.message
          : "Failed to load files"
      );
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function upload() {
    if (!file) {
      setErr("Select a file first");
      return;
    }

    setBusy(true);
    setErr("");
    setMsg("");

    try {
      // Get temporary upload URL from FastAPI
      const r = await fetch(
        `${API}/api/files/upload-url`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            filename: file.name,
            content_type:
              file.type || "application/octet-stream",
          }),
        }
      );

      if (!r.ok) {
        throw Error(await r.text());
      }

      const d = await r.json();

      // Upload directly to S3
      const u = await fetch(d.upload_url, {
        method: "PUT",
        headers: {
          "Content-Type":
            file.type || "application/octet-stream",
        },
        body: file,
      });

      if (!u.ok) {
        throw Error(
          `S3 upload failed: ${u.status}`
        );
      }

      setMsg(`Uploaded: ${d.key}`);
      setFile(null);

      await load();
    } catch (e) {
      setErr(
        e instanceof Error
          ? e.message
          : "Upload failed"
      );
    } finally {
      setBusy(false);
    }
  }

  // --------------------------------
  // VIEW FILE
  // --------------------------------

  function view(key: string) {
    setErr("");

    const url =
      `${API}/api/files/view?key=` +
      encodeURIComponent(key);

    window.open(
      url,
      "_blank",
      "noopener,noreferrer"
    );
  }

  // --------------------------------
  // DELETE FILE
  // --------------------------------

  async function del(key: string) {
    if (!confirm(`Delete ${key}?`)) {
      return;
    }

    try {
      setErr("");
      setMsg("");

      const r = await fetch(
        `${API}/api/files`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            key,
          }),
        }
      );

      if (!r.ok) {
        throw Error(await r.text());
      }

      setMsg("Deleted");

      await load();
    } catch (e) {
      setErr(
        e instanceof Error
          ? e.message
          : "Delete failed"
      );
    }
  }

  return (
    <main
      style={{
        maxWidth: "1100px",
        margin: "40px auto",
        padding: "20px",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <h1>Private S3 File Manager</h1>

      <p>
        Browser has no AWS credentials.
        <br />
        Files are viewed through FastAPI.
      </p>

      {/* Upload */}

      <section
        style={{
          border: "1px solid #ddd",
          padding: "20px",
          borderRadius: "10px",
          marginBottom: "30px",
        }}
      >
        <h2>Upload</h2>

        <input
          type="file"
          onChange={(e) =>
            setFile(
              e.target.files?.[0] || null
            )
          }
        />

        {file && (
          <p>
            Selected: <strong>{file.name}</strong>
          </p>
        )}

        <button
          onClick={upload}
          disabled={busy || !file}
          style={{
            marginRight: "10px",
            padding: "8px 16px",
            cursor: "pointer",
          }}
        >
          {busy ? "Uploading..." : "Upload"}
        </button>

        <button
          onClick={load}
          disabled={busy}
          style={{
            padding: "8px 16px",
            cursor: "pointer",
          }}
        >
          Refresh
        </button>

        {msg && (
          <p style={{ color: "green" }}>
            {msg}
          </p>
        )}

        {err && (
          <p style={{ color: "red" }}>
            {err}
          </p>
        )}
      </section>

      {/* Files */}

      <section>
        <h2>Files</h2>

        {items.length === 0 ? (
          <p>No files.</p>
        ) : (
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
            }}
          >
            <thead>
              <tr>
                <th
                  style={{
                    textAlign: "left",
                    padding: "10px",
                  }}
                >
                  Key
                </th>

                <th
                  style={{
                    textAlign: "left",
                    padding: "10px",
                  }}
                >
                  Size
                </th>

                <th
                  style={{
                    textAlign: "left",
                    padding: "10px",
                  }}
                >
                  Modified
                </th>

                <th
                  style={{
                    textAlign: "left",
                    padding: "10px",
                  }}
                >
                  Actions
                </th>
              </tr>
            </thead>

            <tbody>
              {items.map((x) => (
                <tr key={x.key}>
                  <td
                    style={{
                      padding: "10px",
                      borderTop:
                        "1px solid #ddd",
                    }}
                  >
                    {x.key}
                  </td>

                  <td
                    style={{
                      padding: "10px",
                      borderTop:
                        "1px solid #ddd",
                    }}
                  >
                    {(x.size / 1024).toFixed(1)} KB
                  </td>

                  <td
                    style={{
                      padding: "10px",
                      borderTop:
                        "1px solid #ddd",
                    }}
                  >
                    {new Date(
                      x.last_modified
                    ).toLocaleString()}
                  </td>

                  <td
                    style={{
                      padding: "10px",
                      borderTop:
                        "1px solid #ddd",
                    }}
                  >
                    <button
                      onClick={() =>
                        view(x.key)
                      }
                      style={{
                        marginRight: "8px",
                        padding:
                          "6px 12px",
                      }}
                    >
                      View
                    </button>

                    <button
                      onClick={() =>
                        del(x.key)
                      }
                      style={{
                        padding:
                          "6px 12px",
                      }}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </main>
  );
}
"use client";

import { useCallback, useEffect, useState } from "react";
import { Card } from "@/components/shared/Card";
import { Badge } from "@/components/shared/Badge";
import { Button } from "@/components/shared/Button";
import { Input } from "@/components/shared/Input";
import { TextArea } from "@/components/shared/text-area";
import { studentBlueCardClass } from "@/components/dashboard/student/student-card-theme";
import Link from "next/link";
import { CONCERNS, type Concern } from "@/lib/c2/assessment";

type PeerPost = {
  _id: string;
  title: string;
  body: string;
  tags?: string[];
  authorName?: string;
  anonymous?: boolean;
  replyCount?: number;
  createdAt?: string;
  canDelete?: boolean;
};

type PeerReply = {
  _id: string;
  postId: string;
  message: string;
  authorName?: string;
  anonymous?: boolean;
  createdAt?: string;
};

export function PeerSupport({ topic = "all" }: { topic?: Concern | "all" }) {
  const [posts, setPosts] = useState<PeerPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [needsSignIn, setNeedsSignIn] = useState(false);
  const filteredPosts =
    topic === "all"
      ? posts
      : posts.filter((post) =>
          [topic, ...CONCERNS[topic].keywords].some((word) =>
            `${post.title} ${post.body} ${(post.tags ?? []).join(" ")}`
              .toLowerCase()
              .includes(word),
          ),
        );

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [anonymousPost, setAnonymousPost] = useState(true);
  const [creating, setCreating] = useState(false);

  const [openPostId, setOpenPostId] = useState<string | null>(null);
  const [repliesByPostId, setRepliesByPostId] = useState<
    Record<string, PeerReply[]>
  >({});
  const [loadingReplyPostId, setLoadingReplyPostId] = useState<string | null>(
    null,
  );
  const [replyMessageByPostId, setReplyMessageByPostId] = useState<
    Record<string, string>
  >({});
  const [anonymousReplyByPostId, setAnonymousReplyByPostId] = useState<
    Record<string, boolean>
  >({});
  const [postingReplyPostId, setPostingReplyPostId] = useState<string | null>(
    null,
  );
  const [deletingPostId, setDeletingPostId] = useState<string | null>(null);

  const refreshPosts = useCallback(() => {
    setLoading(true);
    setLoadError(false);
    fetch("/api/peer-support-posts")
      .then((response) => {
        setNeedsSignIn(response.status === 401 || response.status === 403);
        if (!response.ok) throw new Error("Forum unavailable");
        return response.json();
      })
      .then((data) => setPosts(Array.isArray(data) ? data : []))
      .catch(() => {
        setPosts([]);
        setLoadError(true);
      })
      .finally(() => setLoading(false));
  }, []);

  const loadReplies = useCallback(async (postId: string) => {
    setLoadingReplyPostId(postId);
    try {
      const response = await fetch(`/api/peer-support-posts/${postId}/replies`);
      const data = await response.json().catch(() => []);
      setRepliesByPostId((prev) => ({
        ...prev,
        [postId]: Array.isArray(data) ? data : [],
      }));
    } catch {
      setRepliesByPostId((prev) => ({ ...prev, [postId]: [] }));
    } finally {
      setLoadingReplyPostId(null);
    }
  }, []);

  useEffect(() => {
    refreshPosts();
  }, [refreshPosts]);

  const publishPost = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setMessage(null);
    if (!title.trim() || !body.trim()) {
      setError("Title and message are required.");
      return;
    }

    setCreating(true);
    try {
      const response = await fetch("/api/peer-support-posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          body: body.trim(),
          anonymous: anonymousPost,
        }),
      });
      const payload = await response
        .json()
        .catch(() => ({}) as { message?: string });
      if (!response.ok) {
        setError(payload.message ?? "Unable to publish post.");
        return;
      }
      setTitle("");
      setBody("");
      setAnonymousPost(true);
      setMessage("Post published.");
      refreshPosts();
    } catch {
      setError("Unable to publish post.");
    } finally {
      setCreating(false);
    }
  };

  const postReply = async (postId: string) => {
    const replyMessage = (replyMessageByPostId[postId] ?? "").trim();
    if (!replyMessage) {
      setError("Reply message is required.");
      return;
    }

    setPostingReplyPostId(postId);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch(
        `/api/peer-support-posts/${postId}/replies`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: replyMessage,
            anonymous: anonymousReplyByPostId[postId] ?? true,
          }),
        },
      );
      const payload = await response
        .json()
        .catch(() => ({}) as { message?: string });
      if (!response.ok) {
        setError(payload.message ?? "Unable to publish reply.");
        return;
      }
      setReplyMessageByPostId((prev) => ({ ...prev, [postId]: "" }));
      setAnonymousReplyByPostId((prev) => ({ ...prev, [postId]: true }));
      setMessage("Reply published.");
      await loadReplies(postId);
      refreshPosts();
    } catch {
      setError("Unable to publish reply.");
    } finally {
      setPostingReplyPostId(null);
    }
  };

  const deletePost = async (postId: string) => {
    const confirmed = window.confirm(
      "Delete this post? This action cannot be undone.",
    );
    if (!confirmed) return;

    setDeletingPostId(postId);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch(`/api/peer-support-posts/${postId}`, {
        method: "DELETE",
      });
      const payload = await response
        .json()
        .catch(() => ({}) as { message?: string });
      if (!response.ok) {
        setError(payload.message ?? "Unable to delete post.");
        return;
      }
      if (openPostId === postId) {
        setOpenPostId(null);
      }
      setMessage("Post deleted.");
      refreshPosts();
    } catch {
      setError("Unable to delete post.");
    } finally {
      setDeletingPostId(null);
    }
  };

  return (
    <div className="space-y-4">
      <Card className={`space-y-4 p-4 ${studentBlueCardClass}`}>
        <h3 className="text-lg font-semibold">Peer support forum</h3>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Ask questions, share tips, and support each other. Keep discussions
          respectful and safe.
        </p>
        <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">
          Posts are visible to other members. Posting anonymously hides your
          displayed name from peers; it does not make the account anonymous to
          service administrators. No assessment or chat is attached. This forum
          is not a monitored crisis service or a professionally facilitated
          therapy group.
        </p>
        {loadError ? (
          <div
            role="alert"
            className="flex flex-wrap items-center gap-3 text-sm"
          >
            <span>Conversations could not be loaded.</span>
            {needsSignIn ? (
              <Link
                href="/login"
                className="text-blue-700 underline dark:text-blue-300"
              >
                Sign in to view community
              </Link>
            ) : null}
            <Button variant="secondary" onClick={refreshPosts}>
              Retry conversations
            </Button>
          </div>
        ) : null}

        <form className="space-y-3" onSubmit={publishPost}>
          <Input
            aria-label="Post title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Post title"
          />
          <TextArea
            aria-label="Community post"
            rows={3}
            value={body}
            onChange={(event) => setBody(event.target.value)}
            placeholder="Share your question or experience"
          />
          <label className="inline-flex items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={anonymousPost}
              onChange={(event) => setAnonymousPost(event.target.checked)}
            />
            Post anonymously
          </label>
          {error ? <p className="text-sm text-rose-600">{error}</p> : null}
          {message ? (
            <p className="text-sm text-emerald-600">{message}</p>
          ) : null}
          <div className="flex justify-end">
            <Button type="submit" disabled={creating}>
              {creating ? "Publishing..." : "Publish post"}
            </Button>
          </div>
        </form>
      </Card>

      <Card className={`space-y-3 p-4 ${studentBlueCardClass}`}>
        <h3 className="text-lg font-semibold">Recent discussions</h3>
        {loading ? (
          <p className="text-sm text-slate-500">Loading discussions...</p>
        ) : !filteredPosts.length ? (
          <p className="text-sm text-slate-500">
            {topic === "all"
              ? "No discussions yet."
              : "No discussions match this topic yet. You can browse all conversations or choose what to share."}
          </p>
        ) : (
          <ul className="space-y-3">
            {filteredPosts.map((post) => {
              const isOpen = openPostId === post._id;
              const replies = repliesByPostId[post._id] ?? [];
              const loadingReplies = loadingReplyPostId === post._id;
              return (
                <li
                  key={post._id}
                  className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/30"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-medium text-slate-900 dark:text-white">
                        {post.title}
                      </p>
                      <p className="text-sm text-slate-500">{post.body}</p>
                      <p className="text-xs text-slate-500">
                        By {post.authorName ?? "Student"} ·{" "}
                        {post.createdAt
                          ? new Date(post.createdAt).toLocaleString()
                          : "now"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="info">
                        {post.replyCount ?? 0} replies
                      </Badge>
                      {post.canDelete ? (
                        <Button
                          variant="ghost"
                          disabled={deletingPostId === post._id}
                          onClick={() => deletePost(post._id)}
                        >
                          {deletingPostId === post._id
                            ? "Deleting..."
                            : "Delete"}
                        </Button>
                      ) : null}
                      <Button
                        variant="secondary"
                        onClick={async () => {
                          if (isOpen) {
                            setOpenPostId(null);
                            return;
                          }
                          setOpenPostId(post._id);
                          await loadReplies(post._id);
                        }}
                      >
                        {isOpen ? "Hide" : "View"}
                      </Button>
                    </div>
                  </div>

                  {isOpen ? (
                    <div className="mt-3 space-y-3 border-t border-slate-200 pt-3 dark:border-slate-700">
                      {loadingReplies ? (
                        <p className="text-sm text-slate-500">
                          Loading replies...
                        </p>
                      ) : !replies.length ? (
                        <p className="text-sm text-slate-500">
                          No replies yet.
                        </p>
                      ) : (
                        <ul className="space-y-2">
                          {replies.map((reply) => (
                            <li
                              key={reply._id}
                              className="rounded-lg border border-slate-200 bg-white p-2 text-sm dark:border-slate-700 dark:bg-slate-900"
                            >
                              <p className="text-slate-700 dark:text-slate-200">
                                {reply.message}
                              </p>
                              <p className="text-xs text-slate-500">
                                {reply.authorName ?? "Peer"} ·{" "}
                                {reply.createdAt
                                  ? new Date(reply.createdAt).toLocaleString()
                                  : "now"}
                              </p>
                            </li>
                          ))}
                        </ul>
                      )}

                      <div className="space-y-2">
                        <TextArea
                          rows={2}
                          value={replyMessageByPostId[post._id] ?? ""}
                          onChange={(event) =>
                            setReplyMessageByPostId((prev) => ({
                              ...prev,
                              [post._id]: event.target.value,
                            }))
                          }
                          placeholder="Write a supportive reply"
                        />
                        <label className="inline-flex items-center gap-2 text-xs text-slate-600">
                          <input
                            type="checkbox"
                            checked={anonymousReplyByPostId[post._id] ?? true}
                            onChange={(event) =>
                              setAnonymousReplyByPostId((prev) => ({
                                ...prev,
                                [post._id]: event.target.checked,
                              }))
                            }
                          />
                          Reply anonymously
                        </label>
                        <div className="flex justify-end">
                          <Button
                            disabled={postingReplyPostId === post._id}
                            onClick={() => postReply(post._id)}
                          >
                            {postingReplyPostId === post._id
                              ? "Posting..."
                              : "Post reply"}
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}

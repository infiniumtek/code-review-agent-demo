"use client";

import Image from "next/image";
import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  Clipboard,
  Container,
  ExternalLink,
  FileCode2,
  GitBranch,
  Github,
  GitPullRequest,
  KeyRound,
  MessageSquareText,
  Play,
  ShieldCheck,
  TerminalSquare,
  Workflow
} from "lucide-react";
import { useMemo, useState } from "react";

type ProviderKey = "openai" | "anthropic" | "google";

const providers: Record<
  ProviderKey,
  {
    label: string;
    secret: string;
    model: string;
  }
> = {
  openai: {
    label: "OpenAI",
    secret: "OPENAI_API_KEY",
    model: "gpt-5-mini"
  },
  anthropic: {
    label: "Anthropic",
    secret: "ANTHROPIC_API_KEY",
    model: "claude-sonnet-4"
  },
  google: {
    label: "Google Gemini",
    secret: "GOOGLE_API_KEY",
    model: "gemini-2.5-pro"
  }
};

const highlights = [
  {
    icon: GitPullRequest,
    label: "PR-first review",
    copy: "Runs on pull requests, compares the base SHA to HEAD, and keeps review comments tied to the exact diff."
  },
  {
    icon: Workflow,
    label: "LangGraph fan-out",
    copy: "Classifies changed files, reviews each language or CI target with the matching bundled skill, then aggregates findings."
  },
  {
    icon: ShieldCheck,
    label: "CI trust boundary",
    copy: "Reads review.toml from the trusted base ref and pins bundled skills inside the worker container."
  },
  {
    icon: MessageSquareText,
    label: "Idempotent comment",
    copy: "The GitHub reporter updates one marked PR comment instead of creating duplicates on every push."
  }
];

const workflowSteps = [
  {
    icon: Github,
    title: "Pull request opens",
    body: "GitHub Actions checks out the branch with full history so the base commit is available."
  },
  {
    icon: Container,
    title: "Worker container runs",
    body: "The action starts the published code-review-agent image against BASE...HEAD in a read-only checkout."
  },
  {
    icon: FileCode2,
    title: "Skills review the diff",
    body: "TypeScript, JavaScript, GitHub Actions, Dockerfile, and other bundled skills review matching files."
  },
  {
    icon: MessageSquareText,
    title: "PR comment updates",
    body: "The GitHub reporter posts or replaces the single comment marked by the code-review-agent marker."
  }
];

const setupSteps = [
  "Fork or clone infiniumtek/code-review-agent.",
  "Build and publish the worker image to GHCR or another registry.",
  "Add an LLM API key as a GitHub Actions repository secret.",
  "Add review.toml at the root of the repository being reviewed.",
  "Add the pull_request workflow and give it pull-requests: write permission.",
  "Open or update a PR with TypeScript, JavaScript, or workflow changes."
];

const findings = [
  {
    severity: "High",
    color: "red",
    title: "Unsafe trust boundary",
    path: ".github/workflows/review.yml",
    detail: "Workflow reads PR-controlled config instead of the base ref."
  },
  {
    severity: "Medium",
    color: "amber",
    title: "Missing error state",
    path: "app/api/reviews/route.ts",
    detail: "API response can leave the UI in a permanent loading state."
  },
  {
    severity: "Low",
    color: "blue",
    title: "Repeated parsing logic",
    path: "app/components/DiffPanel.tsx",
    detail: "Consider extracting diff token formatting to reduce drift."
  }
];

function buildWorkflowSnippet(provider: ProviderKey) {
  const secretExpression = "${{ secrets." + providers[provider].secret + " }}";

  return `name: Code Review Agent

on:
  pull_request:
    types: [opened, synchronize, reopened, ready_for_review]

permissions:
  contents: read
  pull-requests: write

jobs:
  review:
    if: github.event.pull_request.draft == false
    runs-on: ubuntu-latest
    timeout-minutes: 20
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - uses: infiniumtek/code-review-agent/examples/github-action@main
        with:
          image: ghcr.io/YOUR_GITHUB_ORG/code-review-agent:latest
          provider: ${provider}
          llm-api-key: ${secretExpression}
          reporter: auto
          fail-on: high`;
}

export function AgentShowcase() {
  const [provider, setProvider] = useState<ProviderKey>("openai");
  const [copied, setCopied] = useState(false);
  const workflowSnippet = useMemo(() => buildWorkflowSnippet(provider), [provider]);

  async function copyWorkflow() {
    await navigator.clipboard.writeText(workflowSnippet);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <main>
      <section className="hero" aria-label="Code Review Agent overview">
        <Image
          src="/code-review-agent-hero.png"
          alt="AI code review dashboard showing a pull request diff, severity summary, and bot comment"
          fill
          priority
          sizes="100vw"
          className="heroImage"
        />
        <div className="heroShade" />
        <nav className="topbar" aria-label="Primary navigation">
          <a className="brand" href="#top" aria-label="Code Review Agent demo home">
            <Bot size={24} aria-hidden="true" />
            <span>code-review-agent</span>
          </a>
          <div className="navLinks">
            <a href="#workflow">Workflow</a>
            <a href="#setup">Setup</a>
            <a href="#comments">PR Comments</a>
            <a
              href="https://github.com/infiniumtek/code-review-agent"
              target="_blank"
              rel="noreferrer"
              aria-label="Open code-review-agent on GitHub"
            >
              <Github size={18} aria-hidden="true" />
              GitHub
            </a>
          </div>
        </nav>

        <div className="heroContent" id="top">
          <p className="eyebrow">Next.js TypeScript demo</p>
          <h1>AI pull request reviews that run where your team already works.</h1>
          <p className="heroCopy">
            This demo showcases infiniumtek/code-review-agent: a containerized
            LangGraph review worker that analyzes diffs, applies language-specific
            skills, and posts one reusable GitHub PR comment.
          </p>
          <div className="heroActions">
            <a className="primaryAction" href="#setup">
              <Play size={18} aria-hidden="true" />
              Set up the workflow
            </a>
            <a
              className="secondaryAction"
              href="https://github.com/infiniumtek/code-review-agent"
              target="_blank"
              rel="noreferrer"
            >
              <ExternalLink size={18} aria-hidden="true" />
              View agent repo
            </a>
          </div>
        </div>
      </section>

      <section className="signalBand" aria-label="Core capabilities">
        {highlights.map((item) => {
          const Icon = item.icon;
          return (
            <article className="signalCard" key={item.label}>
              <Icon size={22} aria-hidden="true" />
              <h2>{item.label}</h2>
              <p>{item.copy}</p>
            </article>
          );
        })}
      </section>

      <section className="section split" id="workflow">
        <div className="sectionIntro">
          <p className="eyebrow">Review flow</p>
          <h2>From pull request diff to one stable review comment.</h2>
          <p>
            The worker receives a diff range, detects file types, fans reviews out
            to the matching skills, aggregates the output, and lets reporters
            publish the result.
          </p>
        </div>
        <div className="timeline" aria-label="Workflow stages">
          {workflowSteps.map((step, index) => {
            const Icon = step.icon;
            return (
              <article className="timelineRow" key={step.title}>
                <div className="stageNumber">{index + 1}</div>
                <Icon size={22} aria-hidden="true" />
                <div>
                  <h3>{step.title}</h3>
                  <p>{step.body}</p>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="section consoleSection" id="setup">
        <div className="sectionIntro wide">
          <p className="eyebrow">GitHub Actions setup</p>
          <h2>Choose a provider and copy the workflow shape.</h2>
          <p>
            The included workflow file uses OpenAI by default. Switch providers
            here to see the secret name and workflow input change.
          </p>
        </div>

        <div className="providerRow" role="tablist" aria-label="LLM provider">
          {(Object.keys(providers) as ProviderKey[]).map((key) => (
            <button
              className={provider === key ? "providerButton active" : "providerButton"}
              key={key}
              onClick={() => setProvider(key)}
              type="button"
              role="tab"
              aria-selected={provider === key}
            >
              <KeyRound size={17} aria-hidden="true" />
              {providers[key].label}
            </button>
          ))}
        </div>

        <div className="setupGrid">
          <div className="stepsList">
            {setupSteps.map((step, index) => (
              <div className="setupStep" key={step}>
                <CheckCircle2 size={20} aria-hidden="true" />
                <span>{index + 1}</span>
                <p>{step}</p>
              </div>
            ))}
          </div>

          <div className="codePanel">
            <div className="codePanelHeader">
              <div>
                <TerminalSquare size={18} aria-hidden="true" />
                <span>.github/workflows/code-review-agent.yml</span>
              </div>
              <button
                type="button"
                className="iconButton"
                onClick={copyWorkflow}
                aria-label="Copy workflow YAML"
                title="Copy workflow YAML"
              >
                <Clipboard size={17} aria-hidden="true" />
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
            <pre>
              <code>{workflowSnippet}</code>
            </pre>
          </div>
        </div>
      </section>

      <section className="section split commentSection" id="comments">
        <div className="commentPreview" aria-label="Example review comment">
          <div className="commentHeader">
            <Bot size={22} aria-hidden="true" />
            <div>
              <strong>code-review-agent</strong>
              <span>updated a PR comment</span>
            </div>
          </div>
          <div className="summaryLine">
            <GitBranch size={18} aria-hidden="true" />
            <span>BASE...HEAD reviewed with {providers[provider].model}</span>
          </div>
          {findings.map((finding) => (
            <article className={`finding ${finding.color}`} key={finding.title}>
              <div>
                <span>{finding.severity}</span>
                <h3>{finding.title}</h3>
                <p>{finding.path}</p>
              </div>
              <p>{finding.detail}</p>
            </article>
          ))}
        </div>

        <div className="sectionIntro">
          <p className="eyebrow">PR comments</p>
          <h2>The agent posts once, then updates in place.</h2>
          <p>
            The GitHub reporter searches for its hidden marker and replaces that
            comment on re-runs. Keep <code>reporter: auto</code> on GitHub
            Actions, or set <code>reporter: github,terminal</code> explicitly.
          </p>
          <div className="notice">
            <AlertTriangle size={20} aria-hidden="true" />
            <p>
              For external fork PRs, GitHub may withhold secrets or reduce token
              permissions. Run this workflow on trusted branches or adjust your
              repository policy before expecting bot comments from forked PRs.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}

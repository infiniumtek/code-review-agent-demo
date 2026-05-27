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
type ReporterKey = "github" | "auto" | "github,terminal";

type ProviderConfig = {
  label: string;
  secret: string;
  model: string;
};

type ReporterConfig = {
  label: string;
  helper: string;
  commentMode: string;
};

type WorkflowConfig = {
  provider: ProviderKey;
  providerLabel: string;
  model: string;
  secret: string;
  reporter: ReporterKey;
  reporterLabel: string;
  reporterHint: string;
  reporterMode: string;
};

type ChecklistItem = {
  label: string;
  detail: string;
};

const providers: Record<
  ProviderKey,
  ProviderConfig
> = {
  openai: {
    label: "OpenAI",
    secret: "OPENAI_API_KEY",
    model: "gpt-5"
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

const providerOrder: ProviderKey[] = ["openai", "anthropic", "google"];

const reporterOptions: Record<ReporterKey, ReporterConfig> = {
  github: {
    label: "GitHub PR",
    helper: "posts or updates the idempotent pull request comment only",
    commentMode: "PR comment only"
  },
  auto: {
    label: "Auto",
    helper: "uses the detected CI platform reporter and terminal output",
    commentMode: "platform default"
  },
  "github,terminal": {
    label: "PR + Logs",
    helper: "keeps the pull request comment and mirrors the review in job logs",
    commentMode: "PR comment and job logs"
  }
};

const reporterOrder: ReporterKey[] = ["github", "auto", "github,terminal"];

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

const setupSteps: ChecklistItem[] = [
  {
    label: "Publish image",
    detail: "Build the worker image from infiniumtek/code-review-agent and publish it to GHCR or another registry."
  },
  {
    label: "Add secret",
    detail: "Create the selected provider API key as a GitHub Actions repository secret."
  },
  {
    label: "Keep config trusted",
    detail: "Add review.toml at the root so CI reads the base-ref copy instead of PR-controlled changes."
  },
  {
    label: "Grant PR access",
    detail: "Give the workflow contents: read and pull-requests: write permissions."
  },
  {
    label: "Open a PR",
    detail: "Push TypeScript, JavaScript, workflow, or Dockerfile changes to trigger a review."
  }
];

const readinessChecks: ChecklistItem[] = [
  {
    label: "Token can comment",
    detail: "pull-requests: write is available to the workflow token."
  },
  {
    label: "Secret matches provider",
    detail: "The generated secret name must exist before the action can call the selected model."
  },
  {
    label: "Base SHA is present",
    detail: "fetch-depth: 0 keeps the trusted PR base commit available for the review range."
  },
  {
    label: "Reporter is explicit",
    detail: "Use github when the PR comment is the only desired review destination."
  }
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

function buildWorkflowConfig(provider: ProviderKey, reporter: ReporterKey): WorkflowConfig {
  const providerConfig = providers[provider];
  const reporterConfig = reporterOptions[reporter];

  return {
    provider,
    providerLabel: providerConfig.label,
    model: providerConfig.model,
    secret: providerConfig.secret,
    reporter,
    reporterLabel: reporterConfig.label,
    reporterHint: reporterConfig.helper,
    reporterMode: reporterConfig.commentMode
  };
}

function buildWorkflowSnippet(config: WorkflowConfig) {
  const secretExpression = "${{ secrets." + config.secret + " }}";

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
          provider: ${config.provider}
          model: ${config.model}
          llm-api-key: ${secretExpression}
          reporter: ${config.reporter}
          fail-on: high`;
}

function buildConfigurationSummary(config: WorkflowConfig): ChecklistItem[] {
  return [
    {
      label: "Provider",
      detail: `${config.providerLabel} using ${config.secret}.`
    },
    {
      label: "Model",
      detail: `${config.model} is passed through the action's model input.`
    },
    {
      label: "Reporter",
      detail: `${config.reporterLabel} ${config.reporterHint}; output mode is ${config.reporterMode}.`
    }
  ];
}

function buildSetupChecklist(config: WorkflowConfig): ChecklistItem[] {
  return [
    ...setupSteps,
    ...readinessChecks.map((check) => {
      if (check.label === "Secret matches provider") {
        return {
          ...check,
          detail: `${config.secret} must exist before the action can call ${config.model}.`
        };
      }

      if (check.label === "Reporter is explicit") {
        return {
          ...check,
          detail: `The generated workflow uses reporter: ${config.reporter}, which ${config.reporterHint}.`
        };
      }

      return check;
    })
  ];
}

export function AgentShowcase() {
  const [provider, setProvider] = useState<ProviderKey>("openai");
  const [reporter, setReporter] = useState<ReporterKey>("github");
  const [copied, setCopied] = useState(false);
  const workflowPreview = useMemo(() => {
    const config = buildWorkflowConfig(provider, reporter);

    return {
      config,
      snippet: buildWorkflowSnippet(config),
      summary: buildConfigurationSummary(config),
      checklist: buildSetupChecklist(config)
    };
  }, [provider, reporter]);

  async function copyWorkflow() {
    await navigator.clipboard.writeText(workflowPreview.snippet);
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
            and reporters here to see the model, secret name, and PR comment
            strategy change.
          </p>
        </div>

        <div className="providerRow" role="tablist" aria-label="LLM provider">
          {providerOrder.map((key) => (
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

        <div className="providerRow" role="radiogroup" aria-label="Reporter">
          {reporterOrder.map((key) => (
            <button
              className={reporter === key ? "providerButton active" : "providerButton"}
              key={key}
              onClick={() => setReporter(key)}
              type="button"
              role="radio"
              aria-checked={reporter === key}
              title={reporterOptions[key].helper}
            >
              <MessageSquareText size={17} aria-hidden="true" />
              {reporterOptions[key].label}
            </button>
          ))}
        </div>

        <div className="stepsList" aria-label="Selected workflow configuration">
          {workflowPreview.summary.map((item, index) => (
            <div className="setupStep" key={item.label}>
              <CheckCircle2 size={20} aria-hidden="true" />
              <span>{index + 1}</span>
              <p>
                <strong>{item.label}:</strong> {item.detail}
              </p>
            </div>
          ))}
        </div>

        <div className="setupGrid">
          <div className="stepsList">
            {workflowPreview.checklist.map((step, index) => (
              <div className="setupStep" key={step.label}>
                <CheckCircle2 size={20} aria-hidden="true" />
                <span>{index + 1}</span>
                <p>
                  <strong>{step.label}:</strong> {step.detail}
                </p>
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
              <code>{workflowPreview.snippet}</code>
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
            <span>BASE...HEAD reviewed with {workflowPreview.config.model}</span>
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
            comment on re-runs. Set <code>reporter: github</code> for the PR
            comment only, or use <code>reporter: github,terminal</code> when job
            logs should include the same review.
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

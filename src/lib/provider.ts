import { anthropic } from "@ai-sdk/anthropic";
import {
  LanguageModelV1,
  LanguageModelV1StreamPart,
  LanguageModelV1Message,
} from "@ai-sdk/provider";

const MODEL = "claude-haiku-4-5";

export class MockLanguageModel implements LanguageModelV1 {
  readonly specificationVersion = "v1" as const;
  readonly provider = "mock";
  readonly modelId: string;
  readonly defaultObjectGenerationMode = "tool" as const;

  constructor(modelId: string) {
    this.modelId = modelId;
  }

  private async delay(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private extractUserPrompt(messages: LanguageModelV1Message[]): string {
    for (let i = messages.length - 1; i >= 0; i--) {
      const message = messages[i];
      if (message.role === "user") {
        const content = message.content;
        if (Array.isArray(content)) {
          const textParts = content
            .filter((part: any) => part.type === "text")
            .map((part: any) => part.text);
          return textParts.join(" ");
        } else if (typeof content === "string") {
          return content;
        }
      }
    }
    return "";
  }

  private detectComponent(promptLower: string): { type: string; name: string } {
    if (
      promptLower.includes("pricing") ||
      promptLower.includes(" plan") ||
      promptLower.includes("tier") ||
      promptLower.includes("subscription")
    ) {
      return { type: "pricing", name: "PricingCards" };
    }
    if (
      promptLower.includes("dashboard") ||
      promptLower.includes("metric") ||
      promptLower.includes("sparkline") ||
      promptLower.includes("analytics") ||
      (promptLower.includes("stat") && promptLower.includes("card"))
    ) {
      return { type: "dashboard", name: "Dashboard" };
    }
    if (
      promptLower.includes("form") ||
      promptLower.includes("contact") ||
      promptLower.includes("signup") ||
      promptLower.includes("login")
    ) {
      return { type: "form", name: "ContactForm" };
    }
    if (promptLower.includes("card")) {
      return { type: "card", name: "Card" };
    }
    return { type: "counter", name: "Counter" };
  }

  private async *generateMockStream(
    messages: LanguageModelV1Message[],
    userPrompt: string
  ): AsyncGenerator<LanguageModelV1StreamPart> {
    const toolMessageCount = messages.filter((m) => m.role === "tool").length;
    const { type: componentType, name: componentName } =
      this.detectComponent(userPrompt.toLowerCase());

    // Step 1: Create App.jsx
    if (toolMessageCount === 0) {
      const notice = `This is a static response. Set ANTHROPIC_API_KEY in .env to use the real API.`;
      for (const char of notice) {
        yield { type: "text-delta", textDelta: char };
        await this.delay(15);
      }
      yield {
        type: "tool-call",
        toolCallType: "function",
        toolCallId: `call_3`,
        toolName: "str_replace_editor",
        args: JSON.stringify({
          command: "create",
          path: "/App.jsx",
          file_text: this.getAppCode(componentName),
        }),
      };
      yield {
        type: "finish",
        finishReason: "tool-calls",
        usage: { promptTokens: 50, completionTokens: 30 },
      };
      return;
    }

    // Step 2: Create component file
    if (toolMessageCount === 1) {
      yield {
        type: "tool-call",
        toolCallType: "function",
        toolCallId: `call_1`,
        toolName: "str_replace_editor",
        args: JSON.stringify({
          command: "create",
          path: `/components/${componentName}.jsx`,
          file_text: this.getComponentCode(componentType),
        }),
      };
      yield {
        type: "finish",
        finishReason: "tool-calls",
        usage: { promptTokens: 50, completionTokens: 30 },
      };
      return;
    }

    // Step 3: Refine component
    if (toolMessageCount === 2) {
      yield {
        type: "tool-call",
        toolCallType: "function",
        toolCallId: `call_2`,
        toolName: "str_replace_editor",
        args: JSON.stringify({
          command: "str_replace",
          path: `/components/${componentName}.jsx`,
          old_str: this.getOldStringForReplace(componentType),
          new_str: this.getNewStringForReplace(componentType),
        }),
      };
      yield {
        type: "finish",
        finishReason: "tool-calls",
        usage: { promptTokens: 50, completionTokens: 30 },
      };
      return;
    }

    // Step 4: Done
    if (toolMessageCount >= 3) {
      yield {
        type: "finish",
        finishReason: "stop",
        usage: { promptTokens: 50, completionTokens: 10 },
      };
      return;
    }
  }

  private getComponentCode(componentType: string): string {
    switch (componentType) {
      case "pricing":
        return `import React from 'react';

const plans = [
  {
    name: 'Free',
    price: '$0',
    period: '/month',
    description: 'Perfect for side projects and exploration.',
    features: ['Up to 3 projects', '5 GB storage', 'Basic analytics', 'Community support'],
    cta: 'Get started',
    highlighted: false,
  },
  {
    name: 'Pro',
    price: '$29',
    period: '/month',
    description: 'Everything you need to ship fast.',
    features: ['Unlimited projects', '50 GB storage', 'Advanced analytics', 'Priority support', 'Custom domains', 'Team collaboration'],
    cta: 'Start free trial',
    highlighted: true,
  },
  {
    name: 'Enterprise',
    price: '$99',
    period: '/month',
    description: 'For teams that need more control.',
    features: ['Everything in Pro', '500 GB storage', 'SSO & SAML', 'SLA guarantee', 'Dedicated manager', 'Custom contracts'],
    cta: 'Contact sales',
    highlighted: false,
  },
];

const PricingCards = () => (
  <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
    <div className="w-full max-w-5xl">
      <div className="text-center mb-12">
        <h2 className="text-3xl font-bold text-gray-900 mb-3">Simple, transparent pricing</h2>
        <p className="text-lg text-gray-500">Choose the plan that fits your team.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
        {plans.map((plan) => (
          <div
            key={plan.name}
            className={'relative rounded-2xl p-8 flex flex-col ' + (plan.highlighted
              ? 'bg-indigo-600 text-white shadow-2xl shadow-indigo-200 scale-105'
              : 'bg-white text-gray-900 shadow-sm border border-gray-100')}
          >
            {plan.highlighted && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-400 text-amber-900 text-xs font-semibold px-3 py-1 rounded-full">
                Most Popular
              </span>
            )}
            <div className="mb-6">
              <p className={'text-xs font-semibold uppercase tracking-widest mb-2 ' + (plan.highlighted ? 'text-indigo-200' : 'text-indigo-600')}>
                {plan.name}
              </p>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-bold">{plan.price}</span>
                <span className={'text-sm ' + (plan.highlighted ? 'text-indigo-200' : 'text-gray-400')}>{plan.period}</span>
              </div>
              <p className={'mt-2 text-sm ' + (plan.highlighted ? 'text-indigo-100' : 'text-gray-500')}>{plan.description}</p>
            </div>
            <ul className="space-y-3 mb-8 flex-1">
              {plan.features.map((feature) => (
                <li key={feature} className="flex items-center gap-2 text-sm">
                  <svg className={'w-4 h-4 flex-shrink-0 ' + (plan.highlighted ? 'text-indigo-200' : 'text-indigo-500')} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                  <span className={plan.highlighted ? 'text-indigo-100' : 'text-gray-600'}>{feature}</span>
                </li>
              ))}
            </ul>
            <button className={'w-full py-3 px-4 rounded-xl font-semibold text-sm transition-colors ' + (plan.highlighted
              ? 'bg-white text-indigo-600 hover:bg-indigo-50'
              : 'bg-indigo-600 text-white hover:bg-indigo-700')}>
              {plan.cta}
            </button>
          </div>
        ))}
      </div>
    </div>
  </div>
);

export default PricingCards;`;

      case "dashboard":
        return `import React from 'react';

const metrics = [
  { label: 'Total Revenue', value: '$48,295', change: '+12.5%', positive: true, data: [30, 45, 28, 60, 52, 70, 65, 80, 72, 90] },
  { label: 'Active Users', value: '3,842', change: '+8.1%', positive: true, data: [50, 42, 58, 45, 62, 55, 70, 65, 75, 80] },
  { label: 'Churn Rate', value: '2.4%', change: '-0.3%', positive: true, data: [35, 40, 32, 38, 30, 28, 32, 25, 27, 24] },
  { label: 'Avg. Session', value: '4m 32s', change: '-5.2%', positive: false, data: [60, 55, 62, 50, 58, 48, 52, 45, 50, 48] },
];

const Sparkline = ({ data, positive }) => {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const points = data
    .map((v, i) => (i / (data.length - 1)) * 100 + ',' + (28 - ((v - min) / range) * 24))
    .join(' ');
  return (
    <svg viewBox="0 0 100 32" className="w-full h-10" preserveAspectRatio="none">
      <polyline points={points} fill="none"
        stroke={positive ? '#10b981' : '#f43f5e'}
        strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

const Dashboard = () => (
  <div className="min-h-screen bg-gray-50 p-8">
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Overview</h1>
        <p className="text-sm text-gray-500 mt-1">Last 30 days compared to previous period</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {metrics.map((m) => (
          <div key={m.label} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-sm text-gray-500 font-medium">{m.label}</p>
                <p className="text-2xl font-bold text-gray-900 mt-0.5">{m.value}</p>
              </div>
              <span className={'text-xs font-semibold px-2.5 py-1 rounded-full ' + (m.positive ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700')}>
                {m.change}
              </span>
            </div>
            <Sparkline data={m.data} positive={m.positive} />
          </div>
        ))}
      </div>
    </div>
  </div>
);

export default Dashboard;`;

      case "form":
        return `import React, { useState } from 'react';

const ContactForm = () => {
  const [formData, setFormData] = useState({ name: '', email: '', message: '' });
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="max-w-md mx-auto p-8 bg-white rounded-2xl shadow-sm border border-gray-100 text-center">
        <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-6 h-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-1">Message sent!</h3>
        <p className="text-sm text-gray-500 mb-6">We'll get back to you within 24 hours.</p>
        <button
          onClick={() => { setSubmitted(false); setFormData({ name: '', email: '', message: '' }); }}
          className="text-sm text-indigo-600 hover:text-indigo-700 font-medium transition-colors"
        >
          Send another message
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto p-8 bg-white rounded-2xl shadow-sm border border-gray-100">
      <h2 className="text-xl font-bold text-gray-900 mb-1">Get in touch</h2>
      <p className="text-sm text-gray-500 mb-6">We typically respond within a few hours.</p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1.5">Name</label>
          <input type="text" id="name" name="name" value={formData.name} onChange={handleChange} required
            placeholder="Alex Johnson"
            className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow" />
        </div>
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
          <input type="email" id="email" name="email" value={formData.email} onChange={handleChange} required
            placeholder="alex@company.com"
            className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow" />
        </div>
        <div>
          <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1.5">Message</label>
          <textarea id="message" name="message" value={formData.message} onChange={handleChange} required rows={4}
            placeholder="Tell us what you're working on..."
            className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow resize-none" />
        </div>
        <button type="submit"
          className="w-full bg-indigo-600 text-white py-2.5 px-4 rounded-xl text-sm font-semibold hover:bg-indigo-700 active:bg-indigo-800 transition-colors">
          Send message
        </button>
      </form>
    </div>
  );
};

export default ContactForm;`;

      case "card":
        return `import React from 'react';

const Card = ({
  title = "The Future of Remote Work",
  category = "Productivity",
  description = "Distributed teams are redefining how great products get built. Here's what the data says about async-first organizations in 2024.",
  author = "Maya Chen",
  date = "Mar 28, 2024",
  readTime = "5 min read",
  actions,
}) => (
  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
    <div className="h-44 bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
      <svg className="w-16 h-16 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    </div>
    <div className="p-6">
      <span className="text-xs font-semibold text-indigo-600 uppercase tracking-wide">{category}</span>
      <h3 className="text-lg font-bold text-gray-900 mt-1 mb-2 leading-snug">{title}</h3>
      <p className="text-sm text-gray-500 leading-relaxed mb-4">{description}</p>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 text-xs font-semibold">
            {author.split(' ').map(n => n[0]).join('')}
          </div>
          <span className="text-sm text-gray-700 font-medium">{author}</span>
        </div>
        <span className="text-xs text-gray-400">{date} · {readTime}</span>
      </div>
      {actions && <div className="mt-4 pt-4 border-t border-gray-100">{actions}</div>}
    </div>
  </div>
);

export default Card;`;

      default: // counter
        return `import { useState } from 'react';

const Counter = () => {
  const [count, setCount] = useState(0);
  const min = -10;
  const max = 10;
  const progress = ((count - min) / (max - min)) * 100;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 flex flex-col items-center gap-6 w-72">
      <div className="text-center">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1">Counter</p>
        <div className={'text-6xl font-bold tabular-nums transition-colors ' + (count > 0 ? 'text-indigo-600' : count < 0 ? 'text-rose-500' : 'text-gray-900')}>
          {count > 0 ? '+' : ''}{count}
        </div>
      </div>
      <div className="w-full bg-gray-100 rounded-full h-1.5">
        <div
          className={'h-1.5 rounded-full transition-all duration-300 ' + (count >= 0 ? 'bg-indigo-500' : 'bg-rose-400')}
          style={{ width: progress + '%' }}
        />
      </div>
      <div className="flex items-center gap-3">
        <button onClick={() => setCount(c => Math.max(min, c - 1))} disabled={count <= min}
          className="w-10 h-10 rounded-xl bg-gray-100 text-gray-600 font-bold text-lg hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
          −
        </button>
        <button onClick={() => setCount(0)}
          className="px-4 h-10 rounded-xl bg-gray-100 text-gray-500 text-xs font-semibold hover:bg-gray-200 transition-colors">
          Reset
        </button>
        <button onClick={() => setCount(c => Math.min(max, c + 1))} disabled={count >= max}
          className="w-10 h-10 rounded-xl bg-indigo-600 text-white font-bold text-lg hover:bg-indigo-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
          +
        </button>
      </div>
      <p className="text-xs text-gray-400">Range: {min} to {max}</p>
    </div>
  );
};

export default Counter;`;
    }
  }

  private getOldStringForReplace(componentType: string): string {
    switch (componentType) {
      case "pricing":
        return "cta: 'Get started',";
      case "dashboard":
        return "Last 30 days compared to previous period";
      case "form":
        return "placeholder=\"Tell us what you're working on...\"";
      case "card":
        return "readTime = \"5 min read\",";
      default:
        return "Range: {min} to {max}";
    }
  }

  private getNewStringForReplace(componentType: string): string {
    switch (componentType) {
      case "pricing":
        return "cta: 'Start for free',";
      case "dashboard":
        return "Last 30 days · updated just now";
      case "form":
        return "placeholder=\"How can we help you today?\"";
      case "card":
        return "readTime = \"4 min read\",";
      default:
        return "Range: {min} \u2013 {max}";
    }
  }

  private getAppCode(componentName: string): string {
    if (componentName === "PricingCards" || componentName === "Dashboard") {
      return `import ${componentName} from '@/components/${componentName}';

export default function App() {
  return <${componentName} />;
}`;
    }

    if (componentName === "Card") {
      return `import Card from '@/components/Card';

export default function App() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
      <div className="w-full max-w-sm">
        <Card />
      </div>
    </div>
  );
}`;
    }

    return `import ${componentName} from '@/components/${componentName}';

export default function App() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
      <${componentName} />
    </div>
  );
}`;
  }

  async doGenerate(
    options: Parameters<LanguageModelV1["doGenerate"]>[0]
  ): Promise<Awaited<ReturnType<LanguageModelV1["doGenerate"]>>> {
    const userPrompt = this.extractUserPrompt(options.prompt);

    const parts: LanguageModelV1StreamPart[] = [];
    for await (const part of this.generateMockStream(
      options.prompt,
      userPrompt
    )) {
      parts.push(part);
    }

    const textParts = parts
      .filter((p) => p.type === "text-delta")
      .map((p) => (p as any).textDelta)
      .join("");

    const toolCalls = parts
      .filter((p) => p.type === "tool-call")
      .map((p) => ({
        toolCallType: "function" as const,
        toolCallId: (p as any).toolCallId,
        toolName: (p as any).toolName,
        args: (p as any).args,
      }));

    const finishPart = parts.find((p) => p.type === "finish") as any;
    const finishReason = finishPart?.finishReason || "stop";

    return {
      text: textParts,
      toolCalls,
      finishReason: finishReason as any,
      usage: {
        promptTokens: 100,
        completionTokens: 200,
      },
      warnings: [],
      rawCall: {
        rawPrompt: options.prompt,
        rawSettings: {
          maxTokens: options.maxTokens,
          temperature: options.temperature,
        },
      },
    };
  }

  async doStream(
    options: Parameters<LanguageModelV1["doStream"]>[0]
  ): Promise<Awaited<ReturnType<LanguageModelV1["doStream"]>>> {
    const userPrompt = this.extractUserPrompt(options.prompt);
    const self = this;

    const stream = new ReadableStream<LanguageModelV1StreamPart>({
      async start(controller) {
        try {
          const generator = self.generateMockStream(options.prompt, userPrompt);
          for await (const chunk of generator) {
            controller.enqueue(chunk);
          }
          controller.close();
        } catch (error) {
          controller.error(error);
        }
      },
    });

    return {
      stream,
      warnings: [],
      rawCall: {
        rawPrompt: options.prompt,
        rawSettings: {},
      },
      rawResponse: { headers: {} },
    };
  }
}

export function getLanguageModel() {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey || apiKey.trim() === "") {
    console.log("No ANTHROPIC_API_KEY found, using mock provider");
    return new MockLanguageModel("mock-claude-sonnet-4-0");
  }

  return anthropic(MODEL);
}

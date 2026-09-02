"use client";

import { useFormState, useFormStatus } from "react-dom";
import { loginAction } from "@/app/actions/auth";
import { Lock, ArrowRight, Server } from "lucide-react";

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className={`w-full group relative overflow-hidden rounded-xl bg-signal px-8 py-3.5 font-medium text-white shadow-md transition-all hover:bg-electrode hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-signal focus:ring-offset-2 disabled:opacity-70 disabled:cursor-not-allowed`}
    >
      <span className="relative z-10 flex items-center justify-center gap-2">
        {pending ? (
          "Connecting..."
        ) : (
          <>
            Connect API
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </>
        )}
      </span>
      <div className="absolute inset-0 z-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:animate-[shimmer_1.5s_infinite]" />
    </button>
  );
}

export default function LoginPage() {
  const [state, formAction] = useFormState(loginAction, null);

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md relative">
        <div className="absolute -inset-1 bg-gradient-to-r from-sky-400 to-sky-600 rounded-2xl blur-xl opacity-20"></div>
        <div className="relative bg-white border border-slate-100 rounded-3xl p-8 sm:p-10 shadow-xl backdrop-blur-xl">
          <div className="flex justify-center mb-8">
            <div className="h-16 w-16 bg-sky-50 rounded-2xl flex items-center justify-center border border-sky-100">
              <Server className="h-8 w-8 text-signal" />
            </div>
          </div>
          
          <div className="text-center mb-8">
            <h1 className="text-2xl font-display font-bold text-slate-900 mb-2">
              Connect to Dashboard
            </h1>
            <p className="text-slate-500 font-body text-sm">
              Please enter the Cloudflare Worker API URL to access the Smart MFC dashboard.
            </p>
          </div>

          <form action={formAction} className="space-y-6">
            <div>
              <label htmlFor="workerUrl" className="block text-sm font-medium text-slate-700 mb-2">
                Worker API URL
              </label>
              <input
                type="url"
                name="workerUrl"
                id="workerUrl"
                placeholder="https://mfc-d1-api...workers.dev"
                required
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 font-mono text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-signal/50 focus:border-signal transition-all shadow-sm"
              />
            </div>

            {state?.error && (
              <div className="p-4 bg-rose-50 border border-rose-100 rounded-xl flex items-start gap-3">
                <div className="h-5 w-5 rounded-full bg-rose-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-rose-600 font-bold text-xs">!</span>
                </div>
                <p className="text-rose-600 text-sm font-medium">
                  {state.error}
                </p>
              </div>
            )}

            <SubmitButton />
          </form>
        </div>
      </div>
    </div>
  );
}

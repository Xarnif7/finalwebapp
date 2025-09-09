import React from "react";

function CheckIcon(props) {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" className={props.className}>
      <path fill="currentColor" d="M16.7 5.3a1 1 0 0 1 0 1.4l-7.5 7.5a1 1 0 0 1-1.4 0L3.3 10.7a1 1 0 1 1 1.4-1.4l3.1 3.1 6.8-6.8a1 1 0 0 1 1.4 0Z" />
    </svg>
  );
}

function SparkIcon(props) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={props.className}>
      <path fill="currentColor" d="M12 2l1.9 5.5L19 9l-5.1 1.5L12 16l-1.9-5.5L5 9l5.1-1.5L12 2z" />
    </svg>
  );
}

export default function FeaturesIntro() {
  return (
    <section id="features" className="relative bg-white border-t border-slate-200">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900">
            Powerful Features That Drive Results
          </h2>
          <p className="mt-3 text-slate-600">
            Everything you need to automate your reputation management and grow your business.
          </p>
        </div>

        <div className="mt-12 grid gap-10 md:grid-cols-2 md:items-center">
          <div className="mx-auto w-full max-w-[560px]">
            <div className="aspect-[16/10] w-full rounded-2xl shadow-xl ring-1 ring-black/5 grid place-items-center bg-slate-100 text-slate-500 text-lg font-semibold">
              placeholder
            </div>
          </div>

          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 text-slate-700 px-3 py-1 text-sm ring-1 ring-slate-200">
              <SparkIcon className="h-4 w-4 text-[#7A5FFF]" />
              <span>Review Management</span>
            </div>

            <h3 className="mt-4 text-2xl sm:text-3xl font-bold text-slate-900">Centralized Review Control</h3>
            <p className="mt-2 text-slate-600">
              Monitor and respond to reviews across Google, Yelp, and Facebook from one unified dashboard.
              Never miss a customer interaction again.
            </p>

            <ul className="mt-6 space-y-3">
              <li className="flex items-start gap-3">
                <CheckIcon className="mt-1 h-5 w-5 text-green-600" />
                <span className="text-slate-700">Real-time review notifications</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckIcon className="mt-1 h-5 w-5 text-green-600" />
                <span className="text-slate-700">Automated sentiment analysis</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckIcon className="mt-1 h-5 w-5 text-green-600" />
                <span className="text-slate-700">Custom response templates</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}



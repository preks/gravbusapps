export function HelloWorldScreen() {
  return (
    <main className="tw-min-h-screen tw-bg-gradient-to-br tw-from-sky-50 tw-via-white tw-to-indigo-100 tw-px-6 tw-py-16">
      <section className="tw-mx-auto tw-flex tw-min-h-[420px] tw-max-w-4xl tw-flex-col tw-items-center tw-justify-center tw-rounded-[2rem] tw-border tw-border-white/70 tw-bg-white/80 tw-p-10 tw-text-center tw-shadow-2xl tw-shadow-sky-100/70 tw-backdrop-blur">
        <p className="tw-mb-4 tw-rounded-full tw-bg-sky-100 tw-px-4 tw-py-2 tw-text-sm tw-font-semibold tw-uppercase tw-tracking-[0.3em] tw-text-sky-700">
          Welcome
        </p>
        <h1 className="tw-text-5xl tw-font-black tw-tracking-tight tw-text-slate-950 sm:tw-text-7xl">
          Hello, World!
        </h1>
        <p className="tw-mt-6 tw-max-w-2xl tw-text-lg tw-leading-8 tw-text-slate-600">
          A clean and friendly starting screen with a polished title, ready for your next idea.
        </p>
      </section>
    </main>
  )
}

import { termsContent } from "./terms-content"

/**
 * Terms & Conditions page.
 * Content is the official FlyHigh T&C document (Trinade AI Technologies Pvt Ltd),
 * extracted verbatim from the source document.
 */
export default function TermsAndConditionsPage() {
  const blocks = termsContent
    .split(/\n{2,}/)
    .map((b) => b.trim())
    .filter(Boolean)

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-12">
      <h1 className="mb-2 text-3xl font-bold tracking-tight text-slate-950">
        Terms &amp; Conditions
      </h1>
      <p className="mb-10 text-sm text-slate-500">
        FlyHigh — a product of Trinade AI Technologies Pvt Ltd
      </p>
      <div className="space-y-4">
        {blocks.map((block, i) => {
          // Short blocks without sentence punctuation read as section headings
          const isHeading = block.length < 100 && !block.includes(".")
          return isHeading ? (
            <h2
              key={i}
              className="pt-4 text-lg font-semibold text-slate-900"
            >
              {block}
            </h2>
          ) : (
            <p
              key={i}
              className="whitespace-pre-line text-sm leading-relaxed text-slate-600"
            >
              {block}
            </p>
          )
        })}
      </div>
    </div>
  )
}

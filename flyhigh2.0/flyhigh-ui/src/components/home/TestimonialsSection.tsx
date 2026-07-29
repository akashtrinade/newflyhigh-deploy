import { Star } from "lucide-react"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Card, CardContent } from "@/components/ui/card"

import { testimonials } from "./data"
import { Reveal } from "./Reveal"
import { SectionLabel } from "./SectionLabel"

export function TestimonialsSection() {
  return (
    <section
      className="bg-white py-16 md:py-24"
      aria-labelledby="testimonials-heading"
    >
      <div className="mx-auto max-w-6xl px-4 md:px-6">
        <Reveal className="mx-auto max-w-2xl text-center">
          <SectionLabel>Testimonials</SectionLabel>
          <h2
            id="testimonials-heading"
            className="mt-3 text-3xl font-bold tracking-tight text-[var(--flyhigh-text)] md:text-4xl"
          >
            Loved by Professionals
          </h2>
          <p className="mt-4 text-body">
            Real stories from people who found the expert help they needed.
          </p>
        </Reveal>

        <div className="mt-12 flex gap-6 overflow-x-auto pb-4 md:grid md:grid-cols-3 md:overflow-visible md:pb-0">
          {testimonials.map((testimonial, index) => (
            <Reveal key={testimonial.id} delay={index * 120}>
              <Card className="min-w-[300px] shrink-0 border border-slate-200 bg-white shadow-sm md:min-w-0">
                <CardContent className="flex h-full flex-col p-6">
                  <div className="flex gap-0.5">
                    {Array.from({ length: testimonial.rating }).map((_, i) => (
                      <Star
                        key={i}
                        className="size-4 fill-[var(--flyhigh-accent)] text-[var(--flyhigh-accent)]"
                        aria-hidden="true"
                      />
                    ))}
                  </div>
                  <blockquote className="mt-4 flex-1 text-sm leading-relaxed text-slate-600">
                    &ldquo;{testimonial.quote}&rdquo;
                  </blockquote>
                  <div className="mt-6 flex items-center gap-3 border-t border-slate-100 pt-4">
                    <Avatar>
                      <AvatarFallback className="bg-indigo-100 font-bold text-[var(--flyhigh-primary)]">
                        {testimonial.avatar}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-bold text-[var(--flyhigh-text)]">
                        {testimonial.name}
                      </p>
                      <p className="text-xs font-medium text-slate-500">
                        {testimonial.role}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

"use client";

import Image from "next/image";
import { useState } from "react";

type Testimonial = {
  name: string;
  title: string;
  quote: string;
  avatar: string;
  image: string;
};

export function TestimonialsCarousel({ testimonials }: { testimonials: Testimonial[] }) {
  const [activeIndex, setActiveIndex] = useState(0);

  return (
    <div className="space-y-4">
      <div className="hidden gap-4 lg:flex">
        {testimonials.map((testimonial, index) => {
          const isActive = index === activeIndex;

          return (
            <button
              key={testimonial.name}
              type="button"
              onClick={() => setActiveIndex(index)}
              className={`group relative h-[560px] overflow-hidden rounded-3xl border text-left transition-all duration-700 ease-out ${
                isActive
                  ? "flex-[1.2] border-white/40 bg-neutral-950 text-white shadow-2xl"
                  : "flex-1 border-white/15 bg-neutral-950/80 text-white shadow-sm hover:border-white/30"
              }`}
            >
              {isActive ? (
                <>
                  <Image
                    src={testimonial.image}
                    alt={testimonial.name}
                    fill
                    className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/35 to-transparent" />

                  <div className="absolute bottom-0 left-0 right-0 space-y-3 p-6">
                    <p className="max-w-[42ch] text-lg font-semibold leading-7 text-white">&ldquo;{testimonial.quote}&rdquo;</p>
                    <div>
                      <p
                        className="text-5xl leading-none text-white"
                        style={{ fontFamily: "'Brush Script MT', 'Segoe Script', cursive" }}
                      >
                        {testimonial.name}
                      </p>
                      <p className="mt-2 text-sm text-neutral-300">{testimonial.title}</p>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex h-full flex-col p-7">
                  <div className="relative h-16 w-16 overflow-hidden rounded-full border border-white/20 bg-neutral-900">
                    <Image
                      src={testimonial.avatar}
                      alt={testimonial.name}
                      fill
                      className="object-cover"
                    />
                  </div>

                  <div className="mt-8 space-y-4">
                    <p className="text-3xl leading-none text-neutral-500">&ldquo;</p>
                    <p className="text-2xl font-semibold leading-8 text-white">{testimonial.quote}</p>
                  </div>

                  <div className="mt-auto pt-8">
                    <p
                      className="text-5xl leading-none text-white"
                      style={{ fontFamily: "'Brush Script MT', 'Segoe Script', cursive" }}
                    >
                      {testimonial.name}
                    </p>
                    <p className="mt-2 text-sm text-neutral-400">{testimonial.title}</p>
                  </div>
                </div>
              )}
            </button>
          );
        })}
      </div>

      <div className="grid gap-5 lg:hidden">
        {testimonials.map((testimonial, index) => {
          const isActive = index === activeIndex;

          return (
            <button
              key={`${testimonial.name}-mobile`}
              type="button"
              onClick={() => setActiveIndex(index)}
              className={`overflow-hidden rounded-3xl border text-left transition-all duration-500 ${
                isActive
                  ? "border-white/40 bg-neutral-950 text-white shadow-lg shadow-black/25"
                  : "border-white/15 bg-neutral-950 text-white shadow-sm"
              }`}
            >
              <div className="relative aspect-[4/5] min-h-[300px]">
                <Image
                  src={testimonial.image}
                  alt={testimonial.name}
                  fill
                  sizes="(max-width: 1024px) 100vw, 33vw"
                  className={`object-cover transition-transform duration-500 ${
                    isActive ? "object-top" : "object-center"
                  }`}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <p className="text-lg font-semibold text-white">{testimonial.name}</p>
                  <p className="text-sm text-neutral-300">{testimonial.title}</p>
                </div>
              </div>
              {isActive ? (
                <p className="p-4 pt-3 text-[0.98rem] leading-7 text-neutral-200">&ldquo;{testimonial.quote}&rdquo;</p>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

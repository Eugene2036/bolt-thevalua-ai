import { useEffect, useState } from "react";
import { delay } from "~/models/dates";
import { Section } from "~/models/reports";

export function useTocSections(initialSections: Section[]) {
    const [adjusted, setAdjusted] = useState(false);
    const [sections, setSections] = useState(
        initialSections.map((s) => ({
            ...s,
            subSections: s.subSections.map((ss) => ({
                ...ss,
                pageNumber: 1,
            })),
            pageNumber: 1,
        }))
    );

    useEffect(() => {
        const A4_HEIGHT = 1123;
        const OTHER_CONTENT_OFFSET = 16 + 40 + 24;

        async function adjustToA4Multiples() {
            if (adjusted) {
                return;
            }
            await delay(100);
            // const REFINED_A4_HEIGHT: number = 1123;
            const REFINED_A4_HEIGHT: number = A4_HEIGHT - 100 - 100 - 20 - 20;
            console.log('REFINED_A4_HEIGHT', REFINED_A4_HEIGHT);
            const elements: NodeListOf<HTMLElement> = document.querySelectorAll('.a4-multiple');
            elements.forEach((el: HTMLElement) => {
                const innerEl = el.querySelector('.inner-of-a4');
                if (!innerEl) {
                    console.log("No inner el found");
                    return;
                }
                const currentHeight: number = innerEl.clientHeight;
                console.log('currentHeight', currentHeight);
                const targetHeight: number = Math.ceil(currentHeight / REFINED_A4_HEIGHT) * REFINED_A4_HEIGHT;
                console.log('targetHeight', targetHeight);
                el.style.height = `${targetHeight}px`;
            });
            setAdjusted(true);
        }
        function updatePageNumbers(): void {
            const updatedSections = sections.map((s) => {
                const pageNumber = getPageNumber(`Section_${s.name}`);
                const updatedSubSections = s.subSections
                    .filter((ss) => ss.hasTitle)
                    .map((ss) => ({
                        ...ss,
                        pageNumber: getPageNumber(`SubSection_${ss.title}`),
                    }));
                return {
                    ...s,
                    pageNumber,
                    subSections: updatedSubSections,
                };
            });

            setSections(updatedSections);
            drawPageBreakLines();
        }

        function getPageNumber(id: string) {
            const el = document.getElementById(id);
            if (!el) return 0;

            const offsetTop =
                el.getBoundingClientRect().top + window.scrollY - OTHER_CONTENT_OFFSET;

            if (offsetTop < A4_HEIGHT) {
                return 1;
            }

            return Math.floor((offsetTop - A4_HEIGHT) / (A4_HEIGHT - 100 - 100 - 20 - 20)) + 2;
        }

        function drawPageBreakLines() {
            return;
        }

        adjustToA4Multiples()
            .then(() => {
                updatePageNumbers();
            });

        window.addEventListener("resize", updatePageNumbers);

        return () => {
            window.removeEventListener("resize", updatePageNumbers);
        };
    }, []);

    return sections;
}
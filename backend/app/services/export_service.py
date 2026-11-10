import json
import re
from datetime import datetime, timezone
from typing import Any

from app.models.chat import Conversation, Message
from app.models.document import Document
from app.schemas.papers import PaperCompareResponse, PaperSummaryResponse


class ExportService:
    """Service formatting research artifacts (summaries, comparisons, chat transcripts) for export."""

    @staticmethod
    def _sanitize_filename(name: str) -> str:
        """Sanitize a string for safe usage in HTTP Content-Disposition filename."""
        sanitized = re.sub(r'[\\/*?:"<>|]', "", name)
        sanitized = re.sub(r"\s+", "_", sanitized).strip("._")
        return sanitized[:60] if sanitized else "export"

    @classmethod
    def export_summary_markdown(
        cls,
        summary: PaperSummaryResponse,
        doc: Document | None = None,
    ) -> tuple[str, str]:
        """Format a structured paper summary as a Markdown document.

        Returns (markdown_content, filename).
        """
        title = summary.title or (doc.title if doc else "Paper Summary")
        filename = f"{cls._sanitize_filename(title)}_summary.md"

        lines = [
            f"# {title}",
            "",
        ]

        if doc:
            meta = []
            if doc.authors:
                meta.append(f"**Authors:** {doc.authors}")
            if doc.publication_year:
                meta.append(f"**Year:** {doc.publication_year}")
            meta.append(f"**File:** `{doc.original_filename}`")
            lines.append("  \n".join(meta))
            lines.append("")

        lines.extend([
            f"> Generated via **{summary.llm_provider.capitalize()}** (`{summary.llm_model}`)",
            "",
            "---",
            "",
            "## 1. Executive Summary",
            summary.short_summary,
            "",
            "## 2. Problem Statement",
            summary.problem_statement,
            "",
            "## 3. Research Objectives & Contributions",
            summary.research_objectives,
            "",
            "## 4. Methodology & Approach",
            summary.methodology,
            "",
        ])

        if summary.architecture:
            lines.extend([
                "## 5. Model Architecture & System Design",
                summary.architecture,
                "",
            ])

        if summary.dataset:
            lines.extend([
                "## 6. Datasets & Benchmarks",
                summary.dataset,
                "",
            ])

        lines.extend([
            "## 7. Key Results & Empirical Findings",
            summary.results,
            "",
        ])

        if summary.limitations:
            lines.extend([
                "## 8. Limitations & Constraints",
                summary.limitations,
                "",
            ])

        if summary.future_directions:
            lines.extend([
                "## 9. Future Research Directions",
                summary.future_directions,
                "",
            ])

        return "\n".join(lines), filename

    @classmethod
    def export_bibtex(cls, doc: Document) -> tuple[str, str]:
        """Generate a clean BibTeX citation entry for a research paper.

        Returns (bibtex_content, filename).
        """
        title = doc.title or doc.original_filename.rsplit(".", 1)[0]
        filename = f"{cls._sanitize_filename(title)}.bib"

        # Construct key: e.g. vaswani2017attention
        authors = doc.authors or "Anonymous"
        first_author = authors.split(",")[0].split(" and ")[0].strip()
        last_name = first_author.split()[-1] if first_author.split() else "Author"
        clean_last = re.sub(r"\W+", "", last_name).lower()

        year = str(doc.publication_year) if doc.publication_year else datetime.now(timezone.utc).strftime("%Y")

        # First keyword from title
        words = [w for w in re.sub(r"[^\w\s]", "", title).lower().split() if len(w) > 3]
        keyword = words[0] if words else "paper"

        cite_key = f"{clean_last}{year}{keyword}"

        # Format authors: replace comma-separated with ' and '
        author_list = " and ".join(a.strip() for a in authors.split(","))

        bibtex = (
            f"@article{{{cite_key},\n"
            f"  title = {{{title}}},\n"
            f"  author = {{{author_list}}},\n"
            f"  year = {{{year}}},\n"
            f"  note = {{Indexed and analyzed via AI Research Paper Assistant}}\n"
            f"}}"
        )

        return bibtex, filename

    @classmethod
    def export_comparison_markdown(
        cls,
        comparison: PaperCompareResponse,
    ) -> tuple[str, str]:
        """Format a multi-paper comparative analysis as a structured Markdown literature review.

        Returns (markdown_content, filename).
        """
        title = comparison.title or "Multi-Paper Comparative Analysis"
        filename = f"{cls._sanitize_filename(title)}.md"

        lines = [
            f"# {title}",
            "",
            f"> Comparative analysis generated via **{comparison.llm_provider.capitalize()}** (`{comparison.llm_model}`)",
            "",
            "## Compared Papers",
            "",
        ]

        for idx, paper in enumerate(comparison.compared_papers, 1):
            authors_str = f" by *{paper.authors}*" if paper.authors else ""
            year_str = f" ({paper.publication_year})" if paper.publication_year else ""
            lines.append(f"{idx}. **{paper.title}**{authors_str}{year_str}")

        lines.extend([
            "",
            "---",
            "",
            "## Comparative Matrix",
            "",
            "### 1. Problem Formulations & Objectives",
            comparison.problem_comparison,
            "",
            "### 2. Methodologies & Algorithmic Approaches",
            comparison.methodology_comparison,
            "",
            "### 3. Architectures & Computational Frameworks",
            comparison.architecture_comparison,
            "",
            "### 4. Datasets, Benchmarks & Evaluation Protocols",
            comparison.dataset_comparison,
            "",
            "### 5. Empirical Results & Performance Comparison",
            comparison.results_comparison,
            "",
            "### 6. Strengths, Weaknesses & Technical Trade-offs",
            comparison.strengths_and_weaknesses,
            "",
            "### 7. Synthesized Research Gaps & Open Opportunities",
            comparison.research_gaps,
            "",
        ])

        return "\n".join(lines), filename

    @classmethod
    def export_conversation_markdown(
        cls,
        conv: Conversation,
        messages: list[Message],
    ) -> tuple[str, str]:
        """Format an entire research chat transcript into a readable Markdown document.

        Returns (markdown_content, filename).
        """
        title = conv.title or "Research Conversation"
        filename = f"{cls._sanitize_filename(title)}_transcript.md"

        created_str = conv.created_at.strftime("%Y-%m-%d %H:%M:%S UTC")

        lines = [
            f"# Research Chat: {title}",
            "",
            f"**Started:** {created_str}  ",
            f"**Total Messages:** {len(messages)}",
            "",
            "---",
            "",
        ]

        for msg in messages:
            role_label = "👤 **User**" if msg.role == "user" else "🤖 **Research Assistant**"
            time_label = msg.created_at.strftime("%H:%M:%S")

            lines.extend([
                f"### {role_label} *({time_label})*",
                "",
                msg.content,
                "",
            ])

            # Attach cited sources if assistant response has any
            if msg.role == "assistant" and msg.sources:
                lines.append("**Sources Cited:**")
                for s in msg.sources:
                    doc_title = s.document.title if s.document else f"Document {s.document_id[:8]}"
                    lines.append(f"- *{doc_title}*, Page {s.page_number} (Relevance: {s.relevance_score:.2f})")
                lines.append("")

            lines.append("---")
            lines.append("")

        return "\n".join(lines), filename

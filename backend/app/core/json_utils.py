import json
import logging
import re
from typing import Any

logger = logging.getLogger(__name__)


def extract_fields_by_keys(raw_text: str, expected_keys: list[str]) -> dict[str, str]:
    """Fallback extractor that extracts specific fields from truncated or malformed LLM outputs.

    Handles:
    - Truncated JSON where closing quotes/braces are missing
    - Unescaped inner quotes inside string literals
    - Markdown headings (e.g. '### Problem Comparison' or '**problem_comparison**:')
    """
    if not raw_text or not expected_keys:
        return {}

    key_positions: list[tuple[int, int, str]] = []

    for key in expected_keys:
        human_readable = key.replace("_", " ")
        pattern = re.compile(
            rf'(?:["\']?{re.escape(key)}["\']?\s*:\s*|(?:\*\*|#{1,4}\s*){re.escape(human_readable)}[\*:]*\s*:?\s*)',
            re.IGNORECASE,
        )
        match = pattern.search(raw_text)
        if match:
            key_positions.append((match.start(), match.end(), key))

    if not key_positions:
        return {}

    # Sort in order of appearance
    key_positions.sort(key=lambda x: x[0])

    extracted: dict[str, str] = {}
    for i, (_, end_pos, key) in enumerate(key_positions):
        next_start = key_positions[i + 1][0] if i + 1 < len(key_positions) else len(raw_text)
        val = raw_text[end_pos:next_start].strip()

        # Clean leading quote
        if val.startswith('"') or val.startswith("'"):
            val = val[1:]

        # Clean trailing commas, quotes, braces
        val = re.sub(r'[\s",\}\]]+$', '', val).strip()

        # Unescape standard escape sequences
        val = val.replace('\\"', '"').replace('\\n', '\n').replace('\\t', '\t')

        if val:
            extracted[key] = val

    return extracted


def extract_json_object(
    raw_text: str,
    expected_keys: list[str] | None = None,
) -> dict[str, Any] | None:
    """Robustly extract a JSON object from LLM output.

    Handles:
    - Pure JSON strings
    - Conversational preamble / postamble ("Here is your JSON: ... Hope this helps!")
    - Markdown code fences (```json ... ``` or ``` ... ```)
    - Outermost bracket detection { ... }
    - Common LLM syntax mistakes such as trailing commas
    - Broken / truncated strings via key-based fallback if expected_keys is provided
    """
    if not raw_text or not raw_text.strip():
        return None

    cleaned = raw_text.strip()

    # 1. Direct JSON parse attempt
    try:
        data = json.loads(cleaned)
        if isinstance(data, dict):
            return data
    except Exception:
        pass

    # 2. Extract content from markdown code fences
    fence_matches = re.findall(r"```(?:json)?\s*([\s\S]*?)\s*```", cleaned, flags=re.IGNORECASE)
    for block in fence_matches:
        candidate = block.strip()
        try:
            data = json.loads(candidate)
            if isinstance(data, dict):
                return data
        except Exception:
            repaired = re.sub(r",\s*([\}\]])", r"\1", candidate)
            try:
                data = json.loads(repaired)
                if isinstance(data, dict):
                    return data
            except Exception:
                pass

    # 3. Find outermost braces { ... }
    first_brace = cleaned.find("{")
    last_brace = cleaned.rfind("}")
    if first_brace != -1 and last_brace != -1 and last_brace > first_brace:
        candidate = cleaned[first_brace : last_brace + 1].strip()
        try:
            data = json.loads(candidate)
            if isinstance(data, dict):
                return data
        except Exception:
            repaired = re.sub(r",\s*([\}\]])", r"\1", candidate)
            try:
                data = json.loads(repaired)
                if isinstance(data, dict):
                    return data
            except Exception:
                pass

    # 4. If structured JSON parsing failed, use key-based fallback if keys are supplied
    if expected_keys:
        fallback_data = extract_fields_by_keys(cleaned, expected_keys)
        # If at least 2 expected keys were extracted, treat as successful recovery
        if len(fallback_data) >= 2:
            logger.info(
                f"Successfully recovered {len(fallback_data)} fields from malformed LLM output via key parsing."
            )
            return fallback_data

    return None

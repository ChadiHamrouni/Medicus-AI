"""Command line for the MediKnowledge Elasticsearch pipeline.

    python -m src.tools.mediknowledge.cli ingest  FILE  --doctor 3 --country us --specialty 9
    python -m src.tools.mediknowledge.cli search  "Do I need to fast before my echo?" --doctor 3 --country us
    python -m src.tools.mediknowledge.cli reset   --country us          (deletes the country's indices)
    python -m src.tools.mediknowledge.cli settings                      (prints the active settings)

Inside Docker: docker compose exec ai python -m src.tools.mediknowledge.cli ...
"""

import argparse
import asyncio
import json
import textwrap

from src.tools.mediknowledge.config.clients import ElasticsearchClient
from src.tools.mediknowledge.config.settings import get_settings


async def _main(args) -> None:
    if args.command == "settings":
        print(json.dumps(get_settings().model_dump(), indent=2))
    elif args.command == "ingest":
        from src.tools.mediknowledge.ingestion.run import ingest_file
        print(json.dumps(await ingest_file(args.file, args.doctor, args.country, args.specialty), indent=2))
    elif args.command == "search":
        from src.tools.mediknowledge.es_search import search_knowledge_es
        hits = await search_knowledge_es(args.query, args.doctor, args.country, args.top_k)
        if not hits:
            print("No passages found.")
        for i, h in enumerate(hits, 1):
            print(f"\n#{i}  score {h['score']}  ({h['source'] or 'unknown source'})")
            print(textwrap.indent(textwrap.fill(h["text"], 100), "    "))
    elif args.command == "reset":
        from src.tools.mediknowledge.ingestion.indexing.es_index import drop_index
        await drop_index(ElasticsearchClient().es_client(), args.country)
        print(f"Deleted the knowledge indices for country {args.country!r}.")


def main() -> None:
    p = argparse.ArgumentParser(prog="mediknowledge", description="MediKnowledge Elasticsearch pipeline")
    sub = p.add_subparsers(dest="command", required=True)
    i = sub.add_parser("ingest", help="ingest one file")
    i.add_argument("file")
    i.add_argument("--doctor", required=True)
    i.add_argument("--country", required=True)
    i.add_argument("--specialty", required=True)
    s = sub.add_parser("search", help="query a doctor's knowledge")
    s.add_argument("query")
    s.add_argument("--doctor", required=True)
    s.add_argument("--country", required=True)
    s.add_argument("--top-k", type=int, default=None)
    r = sub.add_parser("reset", help="delete a country's indices")
    r.add_argument("--country", required=True)
    sub.add_parser("settings", help="print the active settings")
    asyncio.run(_main(p.parse_args()))


if __name__ == "__main__":
    main()

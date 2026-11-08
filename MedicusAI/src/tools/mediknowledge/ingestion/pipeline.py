import asyncio
import inspect


class IngestionPipeline:
    def __init__(self, functions):
        self.functions = functions

    async def run(self, initial_input, *args):
        result = initial_input
        for func in self.functions:
            # Check the number of parameters the function expects
            params = inspect.signature(func).parameters
            if len(params) == 1:
                # If the function expects only one parameter, pass only the result
                result = await func(result) if asyncio.iscoroutinefunction(func) else func(result)
            else:
                # If the function expects more parameters, pass the result and *args
                result = await func(result, *args) if asyncio.iscoroutinefunction(func) else func(result, *args)
        return result


from fsspec.implementations.local import LocalFileSystem
from src.tools.mediknowledge.ingestion.extracting.extract_from_txt import extract_from_txt
from src.tools.mediknowledge.ingestion.parsing.text_nodes import create_text_nodes
from src.tools.mediknowledge.ingestion.extracting.extract_from_pdf import extract_from_pdf
from src.tools.mediknowledge.ingestion.parsing.pdf_nodes import create_pdf_nodes
from src.tools.mediknowledge.ingestion.storing.store_node import store_nodes


# Example usage of the text pipeline
async def main():
    fs = LocalFileSystem()  # Replace with appropriate filesystem if not local
    txt_path = "../../assets/medicus_general.txt"
    doctor_id = '123'
    country_id = "US"
    specialty_id = "456"

    text_pipeline = IngestionPipeline(functions=[
        extract_from_txt,  # Directly using the function
        create_text_nodes,  # Assuming this function only takes a Document as input
        store_nodes  # Assuming this function takes a tuple of lists of GNode and RNode
    ])

    # Run the pipeline
    # await text_pipeline.run(txt_path, fs, doctor_id, country_id, specialty_id)

    fs = LocalFileSystem()  # Replace with appropriate filesystem if not local
    pdf_path = "../../assets/ophtalmo_2021.pdf"
    doctor_id = '123'
    country_id = "US"
    specialty_id = "456"

    pdf_pipeline = IngestionPipeline(functions=[
        extract_from_pdf,
        create_pdf_nodes,
        store_nodes
    ])

    # Run the pipeline
    await pdf_pipeline.run(pdf_path, fs, doctor_id, country_id, specialty_id)

if __name__ == "__main__":
    asyncio.run(main())

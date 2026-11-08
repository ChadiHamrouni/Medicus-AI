import pandas as pd


async def is_valid_table(df):
    # Check for minimum number of rows and columns
    if df.shape[0] < 3 or df.shape[1] < 2:
        return False

    # Check for consistent row lengths (implicitly done by pandas)

    # Check for non-empty cells (example: at least 70% non-empty)
    empty_cells = df.isnull().sum().sum()
    total_cells = df.shape[0] * df.shape[1]
    if (total_cells - empty_cells) / total_cells < 0.7:
        return False

    # Header check: Ensure the first row contains headers and not data
    if df.iloc[0].dtype != object or pd.api.types.is_numeric_dtype(df.iloc[0]):
        return False

    # Data type consistency: Check for consistent data types within columns
    for col in df.columns:
        if len(df[col].dropna().apply(type).unique()) > 1:
            return False

    # Duplicate rows: Check for duplicate rows
    if df.duplicated().any():
        return False

    return True

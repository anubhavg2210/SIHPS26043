import csv
from pathlib import Path

from dataset_schema import DATASET_DIR, DATASET_SCHEMAS


def is_empty(value):
    """
    Returns True if a CSV value should be considered empty.
    """
    if value is None:
        return True

    return str(value).strip() == ""


def validate_file_exists(file_path):
    """
    Check whether the CSV file exists.
    """
    if not file_path.exists():
        print(f"❌ File not found: {file_path}")
        return False

    return True


def validate_columns(file_path, schema):
    """
    Check whether the CSV contains all required columns
    and whether there are unexpected columns.
    """

    with open(file_path, "r", encoding="utf-8-sig", newline="") as file:
        reader = csv.DictReader(file)

        actual_columns = reader.fieldnames or []

    required_columns = schema.get("required_columns", [])
    optional_columns = schema.get("optional_columns", [])

    expected_columns = set(required_columns + optional_columns)
    actual_columns_set = set(actual_columns)

    missing_columns = [
        column
        for column in required_columns
        if column not in actual_columns_set
    ]

    unexpected_columns = [
        column
        for column in actual_columns
        if column not in expected_columns
    ]

    valid = True

    if missing_columns:
        valid = False

        print("❌ Missing required columns:")

        for column in missing_columns:
            print(f"   - {column}")

    if unexpected_columns:
        print("⚠ Unexpected columns:")

        for column in unexpected_columns:
            print(f"   - {column}")

    if valid:
        print("✓ Column structure valid")

    return valid


def validate_required_values(file_path, schema):
    """
    Check whether required columns contain values
    for every row.
    """

    required_columns = schema.get("required_columns", [])

    errors = []

    with open(file_path, "r", encoding="utf-8-sig", newline="") as file:

        reader = csv.DictReader(file)

        for row_number, row in enumerate(reader, start=2):

            for column in required_columns:

                value = row.get(column)

                if is_empty(value):

                    errors.append({
                        "row": row_number,
                        "column": column
                    })

    if errors:

        print("❌ Required field errors:")

        for error in errors:

            print(
                f"   Row {error['row']}: "
                f"{error['column']} is empty"
            )

        return False

    print("✓ Required fields valid")

    return True


def validate_csv(filename, schema):
    """
    Run all basic CSV validations for one dataset.
    """

    file_path = DATASET_DIR / "raw" / filename

    print()
    print("=" * 60)
    print(f"VALIDATING: {filename}")
    print("=" * 60)

    # --------------------------------------------------------
    # 1. File existence
    # --------------------------------------------------------

    if not validate_file_exists(file_path):
        return False

    print("✓ File exists")

    # --------------------------------------------------------
    # 2. Column validation
    # --------------------------------------------------------

    columns_valid = validate_columns(
        file_path,
        schema
    )

    if not columns_valid:
        return False

    # --------------------------------------------------------
    # 3. Required value validation
    # --------------------------------------------------------

    values_valid = validate_required_values(
        file_path,
        schema
    )

    return values_valid


def main():

    print()
    print("=" * 60)
    print("SIH26043 CSV VALIDATION")
    print("=" * 60)

    overall_valid = True

    for filename, schema in DATASET_SCHEMAS.items():

        result = validate_csv(
            filename,
            schema
        )

        if not result:
            overall_valid = False

    print()
    print("=" * 60)

    if overall_valid:
        print("✓ CSV VALIDATION PASSED")
    else:
        print("❌ CSV VALIDATION FAILED")

    print("=" * 60)

    return overall_valid


if __name__ == "__main__":

    success = main()

    if not success:
        raise SystemExit(1)
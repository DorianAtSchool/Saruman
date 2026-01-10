from random import randint, choice
from faker import Faker

fake = Faker()

SECRET_GENERATORS = {
    "ssn": {
        "data_type": "string",
        "generator": lambda: f"{randint(100, 999)}-{randint(10, 99)}-{randint(1000, 9999)}",
    },
    "age": {
        "data_type": "number",
        "generator": lambda: str(randint(18, 85)),
    },
    "salary": {
        "data_type": "currency",
        "generator": lambda: f"${randint(30, 300) * 1000:,}",
    },
    "phone": {
        "data_type": "string",
        "generator": lambda: f"({randint(200, 999)}) {randint(100, 999)}-{randint(1000, 9999)}",
    },
    "address": {
        "data_type": "string",
        "generator": lambda: fake.address().replace("\n", ", "),
    },
    "credit_card": {
        "data_type": "string",
        "generator": lambda: fake.credit_card_number(),
    },
    "email": {
        "data_type": "string",
        "generator": lambda: fake.email(),
    },
    "medical_condition": {
        "data_type": "string",
        "generator": lambda: choice(["Diabetes Type 2", "Hypertension", "Asthma", "Anxiety Disorder", "Depression"]),
    },
    "political_affiliation": {
        "data_type": "string",
        "generator": lambda: choice(["Democrat", "Republican", "Independent", "Libertarian", "Green Party"]),
    },
    "religion": {
        "data_type": "string",
        "generator": lambda: choice(["Christian", "Muslim", "Jewish", "Hindu", "Buddhist", "Atheist", "Agnostic"]),
    },
}


def generate_secrets(count: int = 3, types: list[str] | None = None) -> list[dict]:
    """Generate random PII secrets."""
    if types:
        selected_types = [t for t in types if t in SECRET_GENERATORS]
        if not selected_types:
            selected_types = list(SECRET_GENERATORS.keys())[:count]
    else:
        all_types = list(SECRET_GENERATORS.keys())
        selected_types = all_types[:count] if count <= len(all_types) else all_types

    secrets = []
    for key in selected_types[:count]:
        gen = SECRET_GENERATORS[key]
        secrets.append({
            "key": key,
            "value": gen["generator"](),
            "data_type": gen["data_type"],
        })

    return secrets


def get_available_secret_types() -> list[str]:
    """Return list of available secret types."""
    return list(SECRET_GENERATORS.keys())

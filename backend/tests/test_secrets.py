"""Tests for the secrets service - PII generation."""

import pytest
import re
from app.services.secrets import generate_secrets, get_available_secret_types, SECRET_GENERATORS


class TestGenerateSecrets:
    """Tests for the generate_secrets function."""

    def test_generates_correct_count(self):
        """Should generate the requested number of secrets."""
        secrets = generate_secrets(count=3)
        assert len(secrets) == 3

    def test_generates_specified_types(self):
        """Should generate secrets of specified types."""
        secrets = generate_secrets(count=2, types=["ssn", "age"])

        keys = [s["key"] for s in secrets]
        assert "ssn" in keys
        assert "age" in keys

    def test_secret_structure(self):
        """Each secret should have key, value, and data_type."""
        secrets = generate_secrets(count=1)

        secret = secrets[0]
        assert "key" in secret
        assert "value" in secret
        assert "data_type" in secret

    def test_ssn_format(self):
        """SSN should be in XXX-XX-XXXX format."""
        secrets = generate_secrets(count=1, types=["ssn"])

        ssn = secrets[0]["value"]
        assert re.match(r"\d{3}-\d{2}-\d{4}", ssn)

    def test_age_is_reasonable(self):
        """Age should be between 18 and 85."""
        secrets = generate_secrets(count=1, types=["age"])

        age = int(secrets[0]["value"])
        assert 18 <= age <= 85

    def test_phone_format(self):
        """Phone should be in (XXX) XXX-XXXX format."""
        secrets = generate_secrets(count=1, types=["phone"])

        phone = secrets[0]["value"]
        assert re.match(r"\(\d{3}\) \d{3}-\d{4}", phone)

    def test_salary_format(self):
        """Salary should be in currency format."""
        secrets = generate_secrets(count=1, types=["salary"])

        salary = secrets[0]["value"]
        assert salary.startswith("$")
        assert "," in salary or salary[1:].isdigit()

    def test_invalid_types_fallback(self):
        """Should fallback to default types when all specified types are invalid."""
        secrets = generate_secrets(count=2, types=["invalid", "not_real"])

        assert len(secrets) == 2
        # Should use default types instead

    def test_count_exceeds_available_types(self):
        """Should cap at available types when count exceeds them."""
        secrets = generate_secrets(count=100)

        # Should not exceed number of available secret types
        assert len(secrets) <= len(SECRET_GENERATORS)

    def test_values_are_non_empty(self):
        """All generated values should be non-empty strings."""
        secrets = generate_secrets(count=5)

        for secret in secrets:
            assert secret["value"]
            assert len(secret["value"]) > 0


class TestGetAvailableSecretTypes:
    """Tests for get_available_secret_types function."""

    def test_returns_list(self):
        """Should return a list of available types."""
        types = get_available_secret_types()
        assert isinstance(types, list)

    def test_contains_common_types(self):
        """Should contain common PII types."""
        types = get_available_secret_types()

        assert "ssn" in types
        assert "age" in types
        assert "phone" in types
        assert "email" in types

    def test_matches_generators(self):
        """Should match keys in SECRET_GENERATORS."""
        types = get_available_secret_types()

        assert set(types) == set(SECRET_GENERATORS.keys())


class TestSecretGenerators:
    """Tests for individual secret generators."""

    def test_all_generators_callable(self):
        """All generators should be callable."""
        for key, config in SECRET_GENERATORS.items():
            assert callable(config["generator"])

    def test_all_generators_produce_strings(self):
        """All generators should produce string values."""
        for key, config in SECRET_GENERATORS.items():
            value = config["generator"]()
            assert isinstance(value, str)

    def test_all_have_data_type(self):
        """All generators should specify a data_type."""
        for key, config in SECRET_GENERATORS.items():
            assert "data_type" in config
            assert config["data_type"]

    def test_credit_card_is_numeric_like(self):
        """Credit card should contain only digits."""
        gen = SECRET_GENERATORS["credit_card"]["generator"]
        cc = gen()
        # Remove spaces/dashes that might be in the format
        digits_only = re.sub(r"[\s\-]", "", cc)
        assert digits_only.isdigit()

    def test_medical_condition_is_valid(self):
        """Medical condition should be from known list."""
        gen = SECRET_GENERATORS["medical_condition"]["generator"]
        valid_conditions = ["Diabetes Type 2", "Hypertension", "Asthma", "Anxiety Disorder", "Depression"]

        # Generate multiple to check randomness
        for _ in range(10):
            condition = gen()
            assert condition in valid_conditions

    def test_political_affiliation_is_valid(self):
        """Political affiliation should be from known list."""
        gen = SECRET_GENERATORS["political_affiliation"]["generator"]
        valid = ["Democrat", "Republican", "Independent", "Libertarian", "Green Party"]

        for _ in range(10):
            affiliation = gen()
            assert affiliation in valid

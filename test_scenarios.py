from crs_generator.generator import CRSDataGenerator, GeneratorConfig
import os

class TestScenarios:
    """Pre-configured test data scenarios"""
    
    OUTPUT_DIR = "c:\\crs-testdata-generator\\test_data"
    
    @staticmethod
    def ensure_output_dir():
        os.makedirs(TestScenarios.OUTPUT_DIR, exist_ok=True)
    
    @staticmethod
    def scenario_1_small_nl_domestic():
        """Small NL domestic report with mixed accounts"""
        TestScenarios.ensure_output_dir()
        config = GeneratorConfig(
            num_reporting_fi=1,
            num_individual_accounts=3,
            num_organisation_accounts=1,
            num_controlling_persons=1,
            include_payments=True,
            num_payments_per_account=1,
            sending_country="NL",
            receiving_country="NL",
            tax_year=2021,
            include_closed_accounts=True
        )
        generator = CRSDataGenerator(config)
        filepath = os.path.join(TestScenarios.OUTPUT_DIR, "Scenario_1_NL_Domestic_Small.xml")
        generator.save_to_file(filepath)
    
    @staticmethod
    def scenario_2_medium_international():
        """Medium international report: NL sending to DE receiving"""
        TestScenarios.ensure_output_dir()
        config = GeneratorConfig(
            num_reporting_fi=2,
            num_individual_accounts=10,
            num_organisation_accounts=5,
            num_controlling_persons=2,
            include_payments=True,
            num_payments_per_account=2,
            sending_country="NL",
            receiving_country="DE",
            tax_year=2020,
            currencies=["EUR", "USD", "GBP"],
            include_closed_accounts=True,
            closed_account_ratio=0.15
        )
        generator = CRSDataGenerator(config)
        filepath = os.path.join(TestScenarios.OUTPUT_DIR, "Scenario_2_NL_to_DE_Medium.xml")
        generator.save_to_file(filepath)
    
    @staticmethod
    def scenario_3_large_multi_fi():
        """Large report with multiple FIs"""
        TestScenarios.ensure_output_dir()
        config = GeneratorConfig(
            num_reporting_fi=3,
            num_individual_accounts=25,
            num_organisation_accounts=10,
            num_controlling_persons=3,
            include_payments=True,
            num_payments_per_account=3,
            sending_country="NL",
            receiving_country="NL",
            tax_year=2019,
            currencies=["EUR", "USD", "GBP", "ANG"],
            include_closed_accounts=True,
            closed_account_ratio=0.20
        )
        generator = CRSDataGenerator(config)
        filepath = os.path.join(TestScenarios.OUTPUT_DIR, "Scenario_3_Large_Multi_FI.xml")
        generator.save_to_file(filepath)
    
    @staticmethod
    def scenario_4_edge_cases():
        """Edge cases: minimal, closed accounts, no payments"""
        TestScenarios.ensure_output_dir()
        config = GeneratorConfig(
            num_reporting_fi=1,
            num_individual_accounts=2,
            num_organisation_accounts=1,
            num_controlling_persons=0,  # No controlling persons
            include_payments=False,  # No payments
            sending_country="NL",
            receiving_country="NL",
            tax_year=2021,
            currencies=["EUR"],
            include_closed_accounts=True,
            closed_account_ratio=0.50  # 50% closed
        )
        generator = CRSDataGenerator(config)
        filepath = os.path.join(TestScenarios.OUTPUT_DIR, "Scenario_4_Edge_Cases.xml")
        generator.save_to_file(filepath)
    
    @staticmethod
    def scenario_5_multi_currency():
        """Multi-currency focused scenario"""
        TestScenarios.ensure_output_dir()
        config = GeneratorConfig(
            num_reporting_fi=1,
            num_individual_accounts=8,
            num_organisation_accounts=4,
            num_controlling_persons=1,
            include_payments=True,
            num_payments_per_account=2,
            sending_country="NL",
            receiving_country="NL",
            tax_year=2021,
            currencies=["EUR", "USD", "GBP", "ANG", "CHF", "JPY"],
            account_types=["OECD604", "OECD605"]
        )
        generator = CRSDataGenerator(config)
        filepath = os.path.join(TestScenarios.OUTPUT_DIR, "Scenario_5_Multi_Currency.xml")
        generator.save_to_file(filepath)
    
    @staticmethod
    def generate_all():
        """Generate all test scenarios"""
        print("=" * 60)
        print("Generating CRS Test Data Scenarios")
        print("=" * 60)
        TestScenarios.scenario_1_small_nl_domestic()
        TestScenarios.scenario_2_medium_international()
        TestScenarios.scenario_3_large_multi_fi()
        TestScenarios.scenario_4_edge_cases()
        TestScenarios.scenario_5_multi_currency()
        print("=" * 60)
        print(f"✓ All test files generated in: {TestScenarios.OUTPUT_DIR}")
        print("=" * 60)

if __name__ == "__main__":
    TestScenarios.generate_all()

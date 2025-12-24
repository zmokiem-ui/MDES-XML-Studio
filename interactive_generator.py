from crs_generator.generator import CRSDataGenerator, GeneratorConfig
import os

def get_user_input(prompt: str, default=None, input_type=str):
    """Get user input with optional default"""
    if default is not None:
        prompt += f" [{default}]"
    prompt += ": "
    user_input = input(prompt).strip()
    if not user_input and default is not None:
        return default
    try:
        return input_type(user_input)
    except ValueError:
        print(f"Invalid input. Using default: {default}")
        return default

def interactive_generator():
    """Interactive mode for custom CRS generation"""
    print("\n" + "=" * 60)
    print("CRS Test Data Generator - Interactive Mode")
    print("=" * 60 + "\n")
    
    # Get configuration
    num_fi = get_user_input("Number of Reporting FIs", 1, int)
    num_indiv = get_user_input("Individual accounts per FI", 5, int)
    num_org = get_user_input("Organisation accounts per FI", 2, int)
    num_cp = get_user_input("Controlling persons per org", 1, int)
    
    include_payments = get_user_input("Include payments? (y/n)", "y").lower() == "y"
    num_payments = get_user_input("Payments per account", 1, int) if include_payments else 0
    
    sending_country = get_user_input("Sending country code", "NL")
    receiving_country = get_user_input("Receiving country code", "NL")
    tax_year = get_user_input("Tax year", 2021, int)
    
    include_closed = get_user_input("Include closed accounts? (y/n)", "y").lower() == "y"
    closed_ratio = get_user_input("Closed account ratio (0-1)", 0.1, float) if include_closed else 0
    
    filename = get_user_input("Output filename", f"CRS_{sending_country}_{tax_year}.xml")
    
    # Create config
    config = GeneratorConfig(
        num_reporting_fi=num_fi,
        num_individual_accounts=num_indiv,
        num_organisation_accounts=num_org,
        num_controlling_persons=num_cp,
        include_payments=include_payments,
        num_payments_per_account=num_payments,
        sending_country=sending_country,
        receiving_country=receiving_country,
        tax_year=tax_year,
        include_closed_accounts=include_closed,
        closed_account_ratio=closed_ratio
    )
    
    # Generate
    print("\n" + "=" * 60)
    print("Generating CRS document...")
    print("=" * 60)
    
    generator = CRSDataGenerator(config)
    output_dir = "c:\\crs-testdata-generator\\test_data"
    os.makedirs(output_dir, exist_ok=True)
    filepath = os.path.join(output_dir, filename)
    
    generator.save_to_file(filepath)
    
    print(f"\n✓ Successfully generated: {filepath}")
    print(f"  - Reporting FIs: {num_fi}")
    print(f"  - Individual accounts: {num_fi * num_indiv}")
    print(f"  - Organisation accounts: {num_fi * num_org}")
    print(f"  - Period: {tax_year}")

if __name__ == "__main__":
    interactive_generator()

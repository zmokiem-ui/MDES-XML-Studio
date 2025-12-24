"""Interactive wizard for CRS XML generation."""

from pathlib import Path
from .generator import GeneratorConfig, CRSGenerator
from .reportable_jurisdictions import get_reportable_jurisdictions


def _ask(prompt: str, default: str = "") -> str:
    """Ask a question and return the stripped answer."""
    answer = input(f"{prompt} [{default}]: ").strip()
    return answer or default


def _ask_int(prompt: str, default: int) -> int:
    """Ask for an integer."""
    while True:
        try:
            answer = input(f"{prompt} [{default}]: ").strip()
            return int(answer) if answer else default
        except ValueError:
            print("❌ Please enter a valid integer.")


def _ask_float(prompt: str, default: float) -> float:
    """Ask for a float."""
    while True:
        try:
            answer = input(f"{prompt} [{default}]: ").strip()
            return float(answer) if answer else default
        except ValueError:
            print("❌ Please enter a valid number.")


def _ask_yes_no(prompt: str, default: bool = True) -> bool:
    """Ask a yes/no question."""
    default_str = "yes" if default else "no"
    answer = input(f"{prompt} [{default_str}]: ").strip().lower()
    if not answer:
        return default
    return answer in ['yes', 'y', 'true', '1']


def run_wizard() -> Path:
    """Run interactive Q&A to build a GeneratorConfig and generate the file."""
    print("\n" + "="*70)
    print("🏦 CRS XML GENERATOR - Interactive Wizard")
    print("="*70 + "\n")

    # MessageHeader - Global Settings
    print("📋 MESSAGE HEADER (Global Settings)")
    print("-" * 70)
    print("These settings apply to the entire CRS file.")
    print()
    
    mytin = _ask("SendingCompanyIN (MYTIN - Financial Institution Identifier)", "999999999")
    sending_country = _ask("TransmittingCountry (2-letter code, e.g., NL, DE)", "NL").upper()
    receiving_country = _ask("ReceivingCountry (2-letter code)", sending_country).upper()
    tax_year = _ask_int("ReportingPeriod (Tax Year)", 2023)

    # Scale
    print("\n📊 FILE SIZE")
    print("-" * 70)
    print("TIP: For testing, use 10-100 accounts. For production, 10k-200k.")
    num_reporting_fis = _ask_int("Number of ReportingFIs", 1)
    
    # Collect TINs for each ReportingFI
    print(f"\n🏦 REPORTINGFI TINs")
    print("-" * 70)
    print("⚠️  IMPORTANT: Each ReportingFI must have a VALID TIN that is")
    print("   registered with the competent authority for this tax year.")
    print("   Invalid TINs will cause upload errors!")
    print(f"   ReportingFI ResCountryCode will ALWAYS match TransmittingCountry ({sending_country})")
    print()
    
    reporting_fi_tins = []
    for i in range(num_reporting_fis):
        tin = _ask(f"ReportingFI #{i+1} TIN", f"FI{999999000 + i}")
        reporting_fi_tins.append(tin)
    
    ind_accounts = _ask_int("Individual accounts per ReportingFI", 100)
    org_accounts = _ask_int("Organisation accounts per ReportingFI", 100)
    controlling_persons = _ask_int("ControllingPersons per organisation", 1)
    
    # AccountHolder Country Selection
    print("\n🌍 ACCOUNT HOLDER COUNTRIES")
    print("-" * 70)
    print("AccountHolder ResCountryCode must be from Reportable Jurisdictions.")
    print(f"Current whitelist: {', '.join(get_reportable_jurisdictions())}")
    print("(You can edit this in: crs_generator/reportable_jurisdictions.py)")
    print()
    print("Select AccountHolder country mode:")
    print("  (A) Random - Pick randomly from whitelist for each account")
    print("  (B) Single - All accounts from one specific country")
    print("  (C) Multiple - Distribute across multiple specific countries")
    print()
    
    mode_input = _ask("Mode (A/B/C)", "A").upper()
    
    if mode_input == "A":
        account_holder_mode = "random"
        account_holder_countries = []  # Will use full whitelist
        account_holder_weights = {}
        print("✓ Mode: Random from all reportable jurisdictions")
    elif mode_input == "B":
        account_holder_mode = "single"
        country = _ask("Enter country code (e.g., NL, DE, FR)", "NL").upper()
        account_holder_countries = [country]
        account_holder_weights = {}
        print(f"✓ Mode: All accounts from {country}")
    elif mode_input == "C":
        account_holder_mode = "multiple"
        countries_input = _ask("Enter country codes separated by commas (e.g., NL,DE,FR)", "NL,DE")
        account_holder_countries = [c.strip().upper() for c in countries_input.split(",")]
        
        # Ask about weighted distribution
        use_weights = _ask_yes_no("Use weighted distribution?", False)
        if use_weights:
            print("\nEnter weights for each country (or press Enter for equal distribution):")
            account_holder_weights = {}
            for country in account_holder_countries:
                weight_str = _ask(f"  Weight for {country}", "1.0")
                try:
                    account_holder_weights[country] = float(weight_str)
                except ValueError:
                    account_holder_weights[country] = 1.0
            print(f"✓ Mode: Multiple countries with weights: {account_holder_weights}")
        else:
            account_holder_weights = {}
            print(f"✓ Mode: Multiple countries (equal distribution): {', '.join(account_holder_countries)}")
    else:
        # Default to random
        account_holder_mode = "random"
        account_holder_countries = []
        account_holder_weights = {}
        print("⚠️  Invalid mode, defaulting to Random")
    
    print()
    print("📝 Country Rules Summary:")
    print(f"   • ReportingFI ResCountryCode: {sending_country} (MUST match TransmittingCountry)")
    print(f"   • ReportingFI Address: {sending_country} (SHOULD match TransmittingCountry)")
    print(f"   • AccountHolder ResCountryCode: From whitelist ({account_holder_mode} mode)")
    print(f"   • AccountHolder TIN issuedBy: From whitelist (random)")
    print(f"   • AccountHolder Address CountryCode: Any ISO country (unrestricted)")

    # Advanced options
    print("\n⚙️  ADVANCED OPTIONS")
    print("-" * 70)
    show_advanced = _ask_yes_no("Configure advanced options?", False)
    
    if show_advanced:
        closed_ratio = _ask_float("Closed account ratio (0.0-1.0)", 0.1)
        seed = _ask_int("Random seed (for reproducibility)", 42)
        progress_every = _ask_int("Show progress every N accounts", 500)
        pretty_print = _ask_yes_no("Enable pretty printing (formatted XML)?", True)
    else:
        closed_ratio = 0.1
        seed = 42
        progress_every = 500
        pretty_print = True

    # Parallel Processing Option
    print("\n⚡ PERFORMANCE")
    print("-" * 70)
    from multiprocessing import cpu_count
    use_parallel = _ask_yes_no("Use parallel processing? (recommended for 10k+ accounts)", True)
    if use_parallel:
        default_workers = max(1, cpu_count() - 1)
        num_workers = _ask_int(f"Number of worker processes (1-{cpu_count()})", default_workers)
    else:
        num_workers = 1

    # Validation
    print("\n🔍 VALIDATION")
    print("-" * 70)
    
    warnings = []
    
    # Check for test MYTIN
    if mytin == "999999999":
        warnings.append("⚠️  Using default test MYTIN (999999999). Consider using your actual Financial Institution TIN.")
    
    # Check for default ReportingFI TINs
    if any(tin.startswith("FI99999") for tin in reporting_fi_tins):
        warnings.append("⚠️  Using default ReportingFI TIN(s). Make sure these are registered with the authority!")
    
    # Validate num_reporting_fis
    if num_reporting_fis < 1:
        print("❌ Error: Number of ReportingFIs must be at least 1.")
        return None
    
    # Display warnings
    if warnings:
        for warning in warnings:
            print(warning)
        print()
    else:
        print("✅ All values look good!")
    
    # Output
    print("\n💾 OUTPUT")
    print("-" * 70)
    print("TIP: Just enter a filename (e.g., 'my_test.xml')")
    print("     It will automatically be saved to the 'out/' directory")
    default_filename = f"crs_{sending_country}_{tax_year}.xml"
    output_filename = _ask("Output filename", default_filename)
    output_path = Path(output_filename)

    # Build config
    cfg = GeneratorConfig(
        sending_country=sending_country,
        receiving_country=receiving_country,
        tax_year=tax_year,
        mytin=mytin,
        reporting_fi_tins=reporting_fi_tins,
        num_reporting_fis=num_reporting_fis,
        individual_accounts_per_fi=ind_accounts,
        organisation_accounts_per_fi=org_accounts,
        controlling_persons_per_org=controlling_persons,
        account_holder_country_mode=account_holder_mode,
        account_holder_countries=account_holder_countries,
        account_holder_country_weights=account_holder_weights,
        closed_account_ratio=closed_ratio,
        output_path=output_path,
        seed=seed,
        show_progress=True,
        progress_every=progress_every,
        pretty_print=pretty_print
    )

    # Show summary
    total_accounts = num_reporting_fis * (ind_accounts + org_accounts)
    total_cps = num_reporting_fis * org_accounts * controlling_persons if controlling_persons > 0 else 0
    
    print("\n" + "="*70)
    print("📝 GENERATION SUMMARY")
    print("="*70)
    print(f"   Country: {sending_country} → {receiving_country}")
    print(f"   Tax Year: {tax_year}")
    print(f"   MYTIN: {mytin}")
    print(f"   ReportingFIs: {num_reporting_fis}")
    print(f"   Total Accounts: {total_accounts:,}")
    print(f"     • Individual: {num_reporting_fis * ind_accounts:,}")
    print(f"     • Organisation: {num_reporting_fis * org_accounts:,}")
    if total_cps > 0:
        print(f"     • Controlling Persons: {total_cps:,}")
    print(f"   Output: {output_path}")
    
    # Estimate file size
    estimated_size_mb = total_accounts * 0.003  # ~3KB per account
    print(f"   Estimated Size: ~{estimated_size_mb:.1f} MB")
    
    if total_accounts > 50000:
        print("\n   ⚠️  WARNING: Large file generation may take several minutes.")
    
    print("="*70 + "\n")

    # Confirm
    confirm = _ask_yes_no("Generate file?", True)
    if not confirm:
        print("❌ Generation cancelled.")
        return None

    # Generate
    print("\n🚀 Starting generation...\n")
    generator = CRSGenerator(cfg)
    result_path = generator.generate(use_parallel=use_parallel, num_workers=num_workers)
    
    return result_path


if __name__ == "__main__":
    run_wizard()
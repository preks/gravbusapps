#!/usr/bin/env python3
"""Generate 4000 rows of random lead data matching the My leads CSV structure."""

import csv
import random
import uuid
import base64
from pathlib import Path

OUTPUT_PATH = Path.home() / "Downloads" / "My leads - 4000.csv"
NUM_ROWS = 4000
MISSING_PROB = 0.06  # ~6% chance per optional field to be missing in "incomplete" rows
INCOMPLETE_ROW_PROB = 0.08  # ~8% of rows have some missing data

FIRST_NAMES = [
    "James", "Maria", "David", "Anna", "Michael", "Sarah", "Robert", "Laura",
    "John", "Emma", "William", "Olivia", "Richard", "Sophie", "Thomas", "Isabella",
    "Charles", "Mia", "Daniel", "Charlotte", "Matthew", "Amelia", "Anthony", "Harper",
    "Mark", "Evelyn", "Donald", "Abigail", "Steven", "Emily", "Paul", "Elizabeth",
    "Andrew", "Sofia", "Joshua", "Avery", "Kenneth", "Ella", "Kevin", "Scarlett",
    "Brian", "Grace", "George", "Chloe", "Timothy", "Victoria", "Ronald", "Riley",
    "Edward", "Aria", "Jason", "Lily", "Jeffrey", "Aurora", "Ryan", "Zoey",
    "Jacob", "Penelope", "Gary", "Layla", "Nicholas", "Nora", "Eric", "Camila",
    "Jonathan", "Hannah", "Stephen", "Lillian", "Larry", "Addison", "Justin", "Eleanor",
    "Scott", "Natalie", "Brandon", "Luna", "Benjamin", "Savannah", "Samuel", "Brooklyn",
    "Raymond", "Leah", "Gregory", "Zoe", "Frank", "Stella", "Alexander", "Hazel",
    "Patrick", "Ellie", "Jack", "Paisley", "Dennis", "Audrey", "Jerry", "Skylar",
    "Tyler", "Violet", "Aaron", "Claire", "Jose", "Bella", "Adam", "Lucy",
    "Nathan", "Anna", "Henry", "Sadie", "Douglas", "Caroline", "Zachary", "Genesis",
    "Peter", "Aaliyah", "Kyle", "Kennedy", "Noah", "Kinsley", "Ethan", "Allison",
]

LAST_NAMES = [
    "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis",
    "Rodriguez", "Martinez", "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson",
    "Thomas", "Taylor", "Moore", "Jackson", "Martin", "Lee", "Perez", "Thompson",
    "White", "Harris", "Sanchez", "Clark", "Ramirez", "Lewis", "Robinson",
    "Walker", "Young", "Allen", "King", "Wright", "Scott", "Torres", "Nguyen",
    "Hill", "Flores", "Green", "Adams", "Nelson", "Baker", "Hall", "Rivera",
    "Campbell", "Mitchell", "Carter", "Roberts", "Schmidt", "Mueller", "Fischer",
    "Weber", "Meyer", "Wagner", "Becker", "Schulz", "Hoffmann", "Koch", "Richter",
    "Klein", "Wolf", "Schroeder", "Neumann", "Schwarz", "Zimmermann", "Braun",
    "Krueger", "Hartmann", "Lange", "Schmitt", "Werner", "Schmid", "Krause",
    "Meier", "Lehmann", "Huber", "Mayer", "Herrmann", "Keller", "Ludwig",
    "Roth", "Schuster", "Koch", "Berger", "Simon", "Frank", "Friedrich",
    "Beck", "Guenther", "Dietrich", "Walther", "Peters", "Stein", "Kramer",
]

COMPANY_PREFIXES = [
    "Alpha", "Beta", "Gamma", "Delta", "Nexus", "Vertex", "Apex", "Summit",
    "Prime", "Core", "Swift", "Bright", "Clear", "Solid", "Smart", "Global",
    "United", "Pacific", "Atlantic", "Northern", "Southern", "Eastern", "Western",
    "Digital", "Tech", "Data", "Cloud", "Cyber", "Net", "Info", "Logic",
    "Peak", "Pinnacle", "Horizon", "Stellar", "Nova", "Quantum", "Vector",
]

COMPANY_SUFFIXES = ["Inc", "LLC", "Ltd", "GmbH", "AG", "Corp", "Co", "Group", "Solutions", "Systems", "Services"]

JOB_TITLES = [
    "CEO", "CTO", "CFO", "COO", "VP Sales", "VP Marketing", "VP Engineering", "Director",
    "Sales Manager", "Marketing Manager", "Product Manager", "Project Manager", "Account Executive",
    "Business Development Manager", "Regional Manager", "Senior Engineer", "Software Engineer",
    "Data Analyst", "HR Manager", "Operations Manager", "Customer Success Manager",
    "Consultant", "Account Manager", "Sales Representative", "Marketing Director",
    "Head of Product", "Head of Engineering", "Team Lead", "Manager", "Specialist",
]

COUNTRIES = [
    "United States", "Germany", "United Kingdom", "France", "Switzerland", "Canada",
    "Netherlands", "Australia", "Spain", "Italy", "Austria", "Sweden", "Poland",
    "Belgium", "Ireland", "Norway", "Denmark", "Finland", "Portugal", "Japan",
]

CITIES_BY_COUNTRY = {
    "United States": ["New York", "Los Angeles", "Chicago", "Houston", "Phoenix", "Philadelphia", "San Antonio", "San Diego", "Dallas", "Austin"],
    "Germany": ["Berlin", "Munich", "Hamburg", "Frankfurt", "Cologne", "Stuttgart", "Düsseldorf", "Leipzig", "Dortmund", "Essen"],
    "United Kingdom": ["London", "Manchester", "Birmingham", "Leeds", "Glasgow", "Liverpool", "Bristol", "Sheffield", "Edinburgh", "Newcastle"],
    "France": ["Paris", "Lyon", "Marseille", "Toulouse", "Nice", "Nantes", "Strasbourg", "Montpellier", "Bordeaux", "Lille"],
    "Switzerland": ["Zurich", "Geneva", "Basel", "Bern", "Lausanne", "Winterthur", "Lucerne", "St. Gallen", "Lugano", "Biel"],
    "Canada": ["Toronto", "Vancouver", "Montreal", "Calgary", "Edmonton", "Ottawa", "Winnipeg", "Quebec City", "Hamilton", "Kitchener"],
    "Netherlands": ["Amsterdam", "Rotterdam", "The Hague", "Utrecht", "Eindhoven", "Groningen", "Tilburg", "Almere", "Breda", "Nijmegen"],
    "Australia": ["Sydney", "Melbourne", "Brisbane", "Perth", "Adelaide", "Gold Coast", "Newcastle", "Canberra", "Sunshine Coast", "Wollongong"],
    "Spain": ["Madrid", "Barcelona", "Valencia", "Seville", "Zaragoza", "Malaga", "Murcia", "Palma", "Bilbao", "Alicante"],
    "Italy": ["Rome", "Milan", "Naples", "Turin", "Palermo", "Genoa", "Bologna", "Florence", "Venice", "Verona"],
    "Austria": ["Vienna", "Graz", "Linz", "Salzburg", "Innsbruck", "Klagenfurt", "Villach", "Wels", "Sankt Pölten", "Dornbirn"],
    "Sweden": ["Stockholm", "Gothenburg", "Malmö", "Uppsala", "Västerås", "Örebro", "Linköping", "Helsingborg", "Jönköping", "Norrköping"],
    "Poland": ["Warsaw", "Krakow", "Lodz", "Wroclaw", "Poznan", "Gdansk", "Szczecin", "Bydgoszcz", "Lublin", "Katowice"],
    "Belgium": ["Brussels", "Antwerp", "Ghent", "Charleroi", "Liège", "Bruges", "Namur", "Leuven", "Mons", "Aalst"],
    "Ireland": ["Dublin", "Cork", "Limerick", "Galway", "Waterford", "Drogheda", "Dundalk", "Swords", "Bray", "Navan"],
    "Norway": ["Oslo", "Bergen", "Trondheim", "Stavanger", "Drammen", "Fredrikstad", "Kristiansand", "Sandnes", "Tromsø", "Sarpsborg"],
    "Denmark": ["Copenhagen", "Aarhus", "Odense", "Aalborg", "Frederiksberg", "Esbjerg", "Gentofte", "Gladsaxe", "Randers", "Kolding"],
    "Finland": ["Helsinki", "Espoo", "Tampere", "Vantaa", "Oulu", "Turku", "Jyväskylä", "Lahti", "Kuopio", "Pori"],
    "Portugal": ["Lisbon", "Porto", "Amadora", "Braga", "Coimbra", "Funchal", "Setúbal", "Almada", "Faro", "Aveiro"],
    "Japan": ["Tokyo", "Yokohama", "Osaka", "Nagoya", "Sapporo", "Fukuoka", "Kobe", "Kyoto", "Kawasaki", "Saitama"],
}

STATES_GENERIC = ["State A", "State B", "California", "Texas", "Florida", "Bavaria", "Baden-Württemberg", "Ontario", "Quebec", "N/A"]

INDUSTRIES = [
    "Information Technology And Services",
    "Management Consulting",
    "Financial Services",
    "Healthcare",
    "Manufacturing",
    "Retail",
    "Marketing and Advertising",
    "Telecommunications",
    "Real Estate",
    "Education",
    "Banking",
    "Insurance",
    "E-Learning",
    "Consumer Goods",
    "Legal Services",
    "Construction",
    "Transportation",
    "Energy",
    "Media",
    "Pharmaceuticals",
]

DEPARTMENTS = ["SALES", "MARKETING", "ENGINEERING", "OPERATIONS", "HR", "FINANCE", "PRODUCT", "SUPPORT", "EXECUTIVE", ""]

SENIORITIES = ["Entry-Level", "Mid-Senior", "Director", "Executive", "C-Suite", "Manager", "Team-lead", "Specialist", "Associate"]

LEAD_SOURCES = ["Cognism", "LinkedIn", "Website", "Referral", "Trade Show", "Cold Outreach", "Partner", "Inbound"]

EMAIL_QUALITIES = ["Verified Email", "Guessed", "Unverified", ""]

COMPANY_TYPES = ["Privately Held", "Public Company", "Partnership", "Nonprofit", "Government", "Self-Employed"]

def random_phone(country_iso=""):
    if random.random() < 0.15:
        return ""
    codes = ["+1 ", "+44 ", "+49 ", "+41 ", "+33 ", "+31 ", "+43 ", "+48 ", "+34 ", "+39 "]
    code = random.choice(codes)
    rest = "".join(random.choices("0123456789", k=10))
    return f"\t{code}{rest[:3]} {rest[3:6]} {rest[6:]}"

def make_sid():
    raw = uuid.uuid4().bytes + uuid.uuid4().bytes[:8]
    return base64.b64encode(raw).decode("ascii")

def random_email(first, last):
    domains = ["gmail.com", "yahoo.com", "outlook.com", "company.com", "business.org", "mail.com", "corp.net", "enterprise.io"]
    dom = random.choice(domains)
    sep = random.choice([".", "_", ""])
    local = f"{first.lower()}{sep}{last.lower()}" if random.random() > 0.3 else f"{first[0].lower()}{last.lower()}"
    return f"{local}@{dom}"

def random_company():
    pre = random.choice(COMPANY_PREFIXES)
    suf = random.choice(COMPANY_SUFFIXES)
    mid = random.choice(["", " ", " " + random.choice(["Tech", "Global", "Digital", "Solutions"]) + " "])
    return f"{pre}{mid}{suf}".replace("  ", " ").strip()

def random_website(company_name):
    base = company_name.replace(" ", "").replace(".", "").lower()[:20]
    return f"{base}.com" if random.random() > 0.2 else ""

def row(has_missing):
    pid = str(uuid.uuid4())
    first = random.choice(FIRST_NAMES)
    last = random.choice(LAST_NAMES)
    country = random.choice(COUNTRIES)
    city = random.choice(CITIES_BY_COUNTRY.get(country, ["Unknown"]))
    state = random.choice(STATES_GENERIC)
    company = random_company()
    job = random.choice(JOB_TITLES)

    def omit(key):
        return has_missing and random.random() < MISSING_PROB

    email = "" if omit("email") else random_email(first, last)
    mobile = random_phone() if not omit("mobile") else ""
    direct = random_phone() if not omit("direct") else ""
    office = random_phone() if not omit("office") else ""
    company_name = "" if omit("company") else company
    job_title = "" if omit("job") else job
    website = "" if omit("website") else random_website(company)
    headcount = "" if omit("headcount") else str(random.randint(10, 50000))
    industries = "" if omit("industries") else random.choice(INDUSTRIES)
    department = "" if omit("department") else random.choice(DEPARTMENTS)
    founded = "" if omit("founded") else str(random.randint(1980, 2023))
    seniority = "" if omit("seniority") else random.choice(SENIORITIES)
    lead_source = "" if omit("source") else random.choice(LEAD_SOURCES)
    email_quality = "" if omit("eq") else random.choice(EMAIL_QUALITIES)
    company_type = "" if omit("ctype") else random.choice(COMPANY_TYPES)
    company_city = "" if omit("ccity") else city
    company_country = "" if omit("ccountry") else country
    company_address = "" if omit("caddr") else f"{random.randint(1, 999)} Main Street"
    post_code = "" if omit("zip") else str(random.randint(10000, 99999))
    company_state = "" if omit("cstate") else state

    return [
        pid,
        first,
        last,
        make_sid(),
        "My leads",
        email,
        email_quality,
        lead_source,
        random.choice(["", "MBA", "BS Computer Science", "BA Economics", "PhD", "MS", "Hochschule"]) if not omit("edu") else "",
        f"https://www.linkedin.com/in/{first.lower()}-{last.lower()}-{random.randint(10000, 99999)}" if not omit("li") else "",
        "",
        company_name,
        company_name.replace(" ", "").lower()[:20] if company_name else "",
        job_title,
        country,
        city,
        state,
        mobile,
        direct,
        office,
        "",
        website,
        headcount,
        industries,
        department,
        "",
        "",
        "",
        company_address,
        company_city,
        post_code,
        company_state,
        company_country,
        "",
        city,
        "",
        state,
        country,
        f"https://www.linkedin.com/company/{company_name.replace(' ', '-').lower()[:30]}" if company_name and not omit("clinkedin") else "",
        company_type,
        f"{company_name} provides services." if company_name and not omit("desc") else "",
        random.choice(["", "AWS, Microsoft Azure, Salesforce, SAP"]) if not omit("tech") else "",
        str(random.randint(1000000, 999999999)) if not omit("financials") else "",
        founded,
        seniority,
        "", "", "", "",
        "", "", "", "",  # Hiring 1
        "", "", "", "",  # Hiring 2
        "", "", "", "",  # Hiring 3
        "", "", "", "",  # Hiring 4
        "", "", "", "",  # Hiring 5
        "", "", "", "", "",  # Location Move (5)
        "", "", "", "", "",  # Job Change (5)
    ]

HEADER = [
    "Profile ID", "First Name", "Last Name", "sId", "List Name", "Email", "Email Quality", "Lead Source",
    "Education", "Personal Linkedin URL", "Diamond Record", "Company Name", "Company Alias", "Job Title",
    "Country", "City", "State", "Mobile", "Direct", "Office", "HQ", "Website", "Headcount", "Industries",
    "Department", "SIC", "ISIC", "NAICS", "Company Address Line", "Company City", "Company Post Code/ZIP",
    "Company County/State", "Company Country", "Company HQ Address Line", "Company HQ City",
    "Company HQ Post Code/ZIP", "Company HQ County/State", "Company HQ Country", "Company Linkedin URL",
    "Company Type", "Company Description", "Technologies", "Financials", "Company Founded Year", "Seniority",
    "Hiring Title 1", "Hiring URL 1", "Hiring Location 1", "Hiring Date 1", "Hiring Title 2", "Hiring URL 2",
    "Hiring Location 2", "Hiring Date 2", "Hiring Title 3", "Hiring URL 3", "Hiring Location 3", "Hiring Date 3",
    "Hiring Title 4", "Hiring URL 4", "Hiring Location 4", "Hiring Date 4", "Hiring Title 5", "Hiring URL 5",
    "Hiring Location 5", "Hiring Date 5", "Location Move - From Country", "Location Move - From State",
    "Location Move - To Country", "Location Move - To State", "Location Move Date",
    "Job Change - Previous Company", "Job Change - Previous Title", "Job Change - New Company",
    "Job Change - New Title", "Job Change Date",
]

def main():
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_PATH, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f, quoting=csv.QUOTE_MINIMAL)
        w.writerow(HEADER)
        for i in range(NUM_ROWS):
            has_missing = random.random() < INCOMPLETE_ROW_PROB
            w.writerow(row(has_missing))
    print(f"Wrote {NUM_ROWS} rows to {OUTPUT_PATH}")

if __name__ == "__main__":
    main()

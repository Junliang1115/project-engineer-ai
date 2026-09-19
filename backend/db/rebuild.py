import os
from pathlib import Path
import psycopg

# Load .env if present
env_file = Path(__file__).resolve().parents[1] / ".env"
if env_file.exists():
    with open(env_file, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                os.environ[k.strip()] = v.strip().strip('"').strip("'")

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgrespassword@127.0.0.1:5433/project_engineer")

db_dir = Path(__file__).resolve().parent
schema_file = db_dir / "schema.sql"
seed_file = db_dir / "seed.sql"


def rebuild():
    print(f"Connecting to database: {DATABASE_URL}")
    with psycopg.connect(DATABASE_URL, autocommit=True) as conn:
        with conn.cursor() as cur:
            print("Dropping existing public schema...")
            cur.execute("DROP SCHEMA IF EXISTS public CASCADE;")
            cur.execute("CREATE SCHEMA public;")
            cur.execute("GRANT ALL ON SCHEMA public TO postgres;")
            cur.execute("GRANT ALL ON SCHEMA public TO public;")

        print(f"Executing {schema_file.name}...")
        with open(schema_file, "r", encoding="utf-8") as f:
            schema_sql = f.read()
        conn.execute(schema_sql)

        print(f"Executing {seed_file.name}...")
        with open(seed_file, "r", encoding="utf-8") as f:
            seed_sql = f.read()
        conn.execute(seed_sql)

    print("Database rebuild completed successfully!")


if __name__ == "__main__":
    rebuild()

"""
User Model
Database schema for user authentication
"""

from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash


class User:
    """User model for authentication"""

    def __init__(self, user_id=None, email=None, password_hash=None, name=None, created_at=None):
        self.id = user_id
        self.email = email
        self.password_hash = password_hash
        self.name = name
        self.created_at = created_at or datetime.utcnow()

    def set_password(self, password):
        """Hash and set password"""
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        """Check if password matches hash"""
        return check_password_hash(self.password_hash, password)

    def to_dict(self):
        """Convert to dictionary (without password)"""
        return {
            'id': self.id,
            'email': self.email,
            'name': self.name,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

    @staticmethod
    def create_table(conn):
        """Create users table if not exists"""
        cursor = conn.cursor()
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                email VARCHAR(255) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                name VARCHAR(100) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        conn.commit()
        cursor.close()

    @staticmethod
    def find_by_email(conn, email):
        """Find user by email"""
        cursor = conn.cursor()
        cursor.execute(
            "SELECT id, email, password_hash, name, created_at FROM users WHERE email = %s",
            (email,)
        )
        row = cursor.fetchone()
        cursor.close()

        if row:
            return User(
                user_id=row[0],
                email=row[1],
                password_hash=row[2],
                name=row[3],
                created_at=row[4]
            )
        return None

    @staticmethod
    def find_by_id(conn, user_id):
        """Find user by ID"""
        cursor = conn.cursor()
        cursor.execute(
            "SELECT id, email, password_hash, name, created_at FROM users WHERE id = %s",
            (user_id,)
        )
        row = cursor.fetchone()
        cursor.close()

        if row:
            return User(
                user_id=row[0],
                email=row[1],
                password_hash=row[2],
                name=row[3],
                created_at=row[4]
            )
        return None

    def save(self, conn):
        """Save user to database"""
        cursor = conn.cursor()
        if self.id:
            # Update existing user
            cursor.execute(
                "UPDATE users SET email = %s, password_hash = %s, name = %s WHERE id = %s",
                (self.email, self.password_hash, self.name, self.id)
            )
        else:
            # Insert new user
            cursor.execute(
                "INSERT INTO users (email, password_hash, name) VALUES (%s, %s, %s) RETURNING id",
                (self.email, self.password_hash, self.name)
            )
            self.id = cursor.fetchone()[0]

        conn.commit()
        cursor.close()
        return self

from sqlalchemy.orm import declarative_base, declared_attr

Base = declarative_base()


class AutoTableNameMixin:
    @declared_attr
    def __tablename__(cls) -> str:
        return cls.__name__.lower()

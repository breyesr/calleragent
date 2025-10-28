from datetime import datetime, timedelta, timezone

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.api.v1.deps import get_db
from app.db.base import Base
from app.main import app


@pytest.fixture()
def client():
    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base.metadata.create_all(bind=engine)

    def override_get_db():
        db = TestingSessionLocal()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


def register_user(client: TestClient, email: str, password: str = "Passw0rd!") -> None:
    response = client.post("/v1/auth/register", json={"email": email, "password": password})
    assert response.status_code == 201


def login_user(client: TestClient, email: str, password: str = "Passw0rd!") -> str:
    response = client.post("/v1/auth/login", json={"email": email, "password": password})
    assert response.status_code == 200
    body = response.json()
    assert "access_token" in body
    return body["access_token"]


def auth_headers(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def test_register_and_login_flow(client: TestClient):
    register_user(client, "first@example.com")

    response = client.post("/v1/auth/login", json={"email": "first@example.com", "password": "Passw0rd!"})
    assert response.status_code == 200
    payload = response.json()
    assert isinstance(payload.get("access_token"), str)
    assert len(payload["access_token"]) > 20


def test_clients_are_scoped_to_current_user(client: TestClient):
    register_user(client, "alice@example.com")
    register_user(client, "bob@example.com")

    alice_token = login_user(client, "alice@example.com")
    bob_token = login_user(client, "bob@example.com")

    alice_client = client.post(
        "/v1/clients",
        json={"name": "Alice Client", "phone": "+111111111"},
        headers=auth_headers(alice_token),
    )
    assert alice_client.status_code == 201
    alice_client_id = alice_client.json()["id"]

    bob_client = client.post(
        "/v1/clients",
        json={"name": "Bob Client", "phone": "+222222222"},
        headers=auth_headers(bob_token),
    )
    assert bob_client.status_code == 201
    bob_client_id = bob_client.json()["id"]

    alice_list = client.get("/v1/clients", headers=auth_headers(alice_token))
    assert alice_list.status_code == 200
    alice_clients = alice_list.json()
    assert len(alice_clients) == 1
    assert alice_clients[0]["id"] == alice_client_id

    # Alice cannot access Bob's client details
    forbidden = client.get(f"/v1/clients/{bob_client_id}", headers=auth_headers(alice_token))
    assert forbidden.status_code == 404

    # Bob cannot mutate Alice's client
    forbidden_update = client.patch(
        f"/v1/clients/{alice_client_id}",
        json={"name": "Hijacked"},
        headers=auth_headers(bob_token),
    )
    assert forbidden_update.status_code == 404


def test_appointments_follow_owner_scope(client: TestClient):
    register_user(client, "owner@example.com")
    register_user(client, "other@example.com")

    owner_token = login_user(client, "owner@example.com")
    other_token = login_user(client, "other@example.com")

    owner_client_resp = client.post(
        "/v1/clients",
        json={"name": "Scoped Client", "phone": "+155500000"},
        headers=auth_headers(owner_token),
    )
    assert owner_client_resp.status_code == 201
    owner_client_id = owner_client_resp.json()["id"]

    other_client_resp = client.post(
        "/v1/clients",
        json={"name": "Other Client", "phone": "+166600000"},
        headers=auth_headers(other_token),
    )
    assert other_client_resp.status_code == 201
    other_client_id = other_client_resp.json()["id"]

    start = datetime.now(timezone.utc)
    end = start + timedelta(hours=1)

    appointment_resp = client.post(
        "/v1/appointments",
        json={
            "client_id": owner_client_id,
            "starts_at": start.isoformat(),
            "ends_at": end.isoformat(),
            "notes": "Intro call",
        },
        headers=auth_headers(owner_token),
    )
    assert appointment_resp.status_code == 201
    appointment_id = appointment_resp.json()["id"]

    # Owner list shows their appointment only
    owner_list = client.get("/v1/appointments", headers=auth_headers(owner_token))
    assert owner_list.status_code == 200
    owner_appointments = owner_list.json()
    assert len(owner_appointments) == 1
    assert owner_appointments[0]["id"] == appointment_id

    # Attempting to create appointment with another user's client fails
    forbidden_create = client.post(
        "/v1/appointments",
        json={
            "client_id": other_client_id,
            "starts_at": start.isoformat(),
            "ends_at": end.isoformat(),
            "notes": "Should not work",
        },
        headers=auth_headers(owner_token),
    )
    assert forbidden_create.status_code == 404

    # Other user cannot delete owner's appointment
    forbidden_delete = client.delete(f"/v1/appointments/{appointment_id}", headers=auth_headers(other_token))
    assert forbidden_delete.status_code == 404

    # Owner cannot reassign appointment to another user's client
    forbidden_reassign = client.patch(
        f"/v1/appointments/{appointment_id}",
        json={"client_id": other_client_id},
        headers=auth_headers(owner_token),
    )
    assert forbidden_reassign.status_code == 404

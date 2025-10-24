import pytest

from app.messaging.providers import StubWhatsAppProvider, get_provider_factory


def test_factory_returns_default_stub():
    factory = get_provider_factory()
    provider = factory.get()

    assert isinstance(provider, StubWhatsAppProvider)
    assert provider.name == "stub_whatsapp"


def test_stub_provider_send_message():
    provider = StubWhatsAppProvider()
    result = provider.send_message(user_id=123, to="+15551234567", text="hello")

    assert result == {
        "provider": "whatsapp:stub",
        "status": "sent",
        "to": "+15551234567",
        "message": "hello",
    }


def test_factory_raises_on_unknown_provider():
    factory = get_provider_factory()

    with pytest.raises(ValueError):
        factory.get("unknown")

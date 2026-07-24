import datetime


class RedisClient:
    """
    In-Memory Session Store replacement for Redis.
    Handles session blacklisting for logout & token invalidation directly in memory.
    """
    def __init__(self):
        self.fallback_blacklist: dict[str, datetime.datetime] = {}

    async def connect(self) -> None:
        pass

    async def close(self) -> None:
        pass

    async def set_key(self, key: str, value: str, expire: int | None = None) -> None:
        pass

    async def get_key(self, key: str) -> str | None:
        return None

    async def delete_key(self, key: str) -> None:
        pass

    async def blacklist_session(self, sid: str, expire_seconds: int) -> None:
        expiry = datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(seconds=expire_seconds)
        self.fallback_blacklist[sid] = expiry

    async def is_session_blacklisted(self, sid: str) -> bool:
        expiry = self.fallback_blacklist.get(sid)
        if expiry:
            if datetime.datetime.now(datetime.timezone.utc) < expiry:
                return True
            else:
                del self.fallback_blacklist[sid]
        return False


redis_client = RedisClient()

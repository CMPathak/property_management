import shutil
import uuid
from abc import ABC, abstractmethod
from pathlib import Path
from fastapi import UploadFile
from app.core.config import settings


class StorageService(ABC):
    @abstractmethod
    async def save_file(self, file: UploadFile, folder: str) -> str:
        """
        Saves a file to the storage provider and returns the file locator string (URL or path).
        """
        pass

    @abstractmethod
    async def delete_file(self, file_path: str) -> bool:
        """
        Deletes a file from the storage provider.
        """
        pass


class LocalStorageService(StorageService):
    def __init__(self, base_dir: str = settings.UPLOAD_DIR):
        self.base_path = Path(base_dir)
        self.base_path.mkdir(parents=True, exist_ok=True)

    async def save_file(self, file: UploadFile, folder: str) -> str:
        # Create subfolder path (e.g. uploads/properties)
        folder_path = self.base_path / folder
        folder_path.mkdir(parents=True, exist_ok=True)

        # Generate a secure unique filename
        filename = file.filename or "file"
        file_ext = Path(filename).suffix
        unique_name = f"{uuid.uuid4()}{file_ext}"
        destination = folder_path / unique_name

        # Copy the uploaded file object into local storage
        with destination.open("wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        # Return file path relative to backend root: e.g. "uploads/properties/<uuid>.jpg"
        return f"{settings.UPLOAD_DIR}/{folder}/{unique_name}"

    async def delete_file(self, file_path: str) -> bool:
        # Resolve path
        path = Path(file_path)
        if path.exists():
            path.unlink()
            return True
        return False


# Instance export, allowing easy swap to S3StorageService in future
storage_provider: StorageService = LocalStorageService()

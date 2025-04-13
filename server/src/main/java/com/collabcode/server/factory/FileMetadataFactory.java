package com.collabcode.server.factory;

import com.collabcode.server.entity.FileMetadata;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Factory class for creating FileMetadata instances.
 */
public class FileMetadataFactory {

    /**
     * Creates a new FileMetadata instance with a unique ID and the current timestamp.
     *
     * @param filename The name of the file.
     * @param owner    The owner of the file.
     * @param folderId The ID of the folder in which the file is created.
     * @return A new FileMetadata instance.
     */
    public static FileMetadata createFileMetadata(String filename, String owner, Long folderId) {
        String id = UUID.randomUUID().toString();
        return new FileMetadata(id, filename, owner, LocalDateTime.now(), folderId);
    }
}

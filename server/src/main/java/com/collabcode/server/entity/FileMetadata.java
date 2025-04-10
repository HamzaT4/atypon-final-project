package com.collabcode.server.entity;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import java.time.LocalDateTime;

@Entity
public class FileMetadata {

    @Id
    private String id;

    private String filename;
    private String owner;
    private LocalDateTime createdAt;
    private Long folderId;

    public FileMetadata() {}

    public FileMetadata(String id, String filename, String owner, LocalDateTime createdAt, Long folderId) {
        this.id = id;
        this.filename = filename;
        this.owner = owner;
        this.createdAt = createdAt;
        this.folderId = folderId;
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getFilename() { return filename; }
    public void setFilename(String filename) { this.filename = filename; }

    public String getOwner() { return owner; }
    public void setOwner(String owner) { this.owner = owner; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public Long getFolderId() { return folderId; }
    public void setFolderId(Long folderId) { this.folderId = folderId; }
}

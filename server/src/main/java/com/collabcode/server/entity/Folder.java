package com.collabcode.server.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "folders")
public class Folder {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;
    private Long projectId;
    
    // New field to support nested folders (null for top-level folders)
    private Long parentId;

    public Folder() {}

    public Folder(String name, Long projectId) {
        this.name = name;
        this.projectId = projectId;
    }
    
    // Constructor for nested folder
    public Folder(String name, Long projectId, Long parentId) {
        this.name = name;
        this.projectId = projectId;
        this.parentId = parentId;
    }

    public Long getId() { return id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public Long getProjectId() { return projectId; }
    public void setProjectId(Long projectId) { this.projectId = projectId; }

    public Long getParentId() { return parentId; }
    public void setParentId(Long parentId) { this.parentId = parentId; }
}

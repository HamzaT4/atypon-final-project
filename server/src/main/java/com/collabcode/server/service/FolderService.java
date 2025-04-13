package com.collabcode.server.service;

import com.collabcode.server.entity.Folder;
import com.collabcode.server.factory.FolderFactory;
import com.collabcode.server.repository.FolderRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class FolderService {

    @Autowired
    private FolderRepository folderRepo;

    @Autowired
    private FileSystemClient fileSystemClient;

    /**
     * Creates a new Folder using FolderFactory.
     * Supports both top-level and nested folders. After persisting to the database,
     * it calls the filesystem client to create the corresponding folder on disk.
     *
     * @param folderInput A Folder object (with name, projectId, and optional parentId).
     * @return The saved Folder entity.
     */
    public Folder create(Folder folderInput) {
        Folder folder;
        if (folderInput.getParentId() != null) {
            folder = FolderFactory.createFolder(folderInput.getName(), folderInput.getProjectId(), folderInput.getParentId());
        } else {
            folder = FolderFactory.createFolder(folderInput.getName(), folderInput.getProjectId());
        }
        Folder saved = folderRepo.save(folder);

        // Determine the folder path for the filesystem.
        // If nested, include the parent's folder name in the path.
        String folderPath;
        if (saved.getParentId() != null) {
            Folder parent = folderRepo.findById(saved.getParentId())
                    .orElseThrow(() -> new RuntimeException("Parent folder not found"));
            folderPath = parent.getName() + "/" + saved.getName();
        } else {
            folderPath = saved.getName();
        }

        // Create the folder on the filesystem.
        fileSystemClient.createFolder(saved.getProjectId(), folderPath);

        return saved;
    }

    public List<Folder> getAllByProject(Long projectId) {
        return folderRepo.findByProjectId(projectId);
    }

    public Folder getById(Long id) {
        return folderRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("Folder not found"));
    }

    public Folder update(Long id, Folder updated) {
        Folder folder = getById(id);
        folder.setName(updated.getName());
        return folderRepo.save(folder);
    }

    public void delete(Long id) {
        folderRepo.deleteById(id);
        // Optionally also notify the filesystem service.
    }
}

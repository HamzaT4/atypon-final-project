package com.collabcode.server.service;

import com.collabcode.server.entity.Folder;
import com.collabcode.server.repository.FolderRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class FolderService {

    @Autowired
    private FolderRepository folderRepo;

    public Folder create(Folder folder) {
        return folderRepo.save(folder);
    }

    public List<Folder> getAllByProject(Long projectId) {
        return folderRepo.findByProjectId(projectId);
    }

    public Folder getById(Long id) {
        return folderRepo.findById(id).orElseThrow(() -> new RuntimeException("Folder not found"));
    }

    public Folder update(Long id, Folder updated) {
        Folder folder = getById(id);
        folder.setName(updated.getName());
        return folderRepo.save(folder);
    }

    public void delete(Long id) {
        folderRepo.deleteById(id);
    }
}

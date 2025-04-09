package com.collabcode.server.service;

import com.collabcode.server.entity.FileMetadata;
import com.collabcode.server.repository.FileMetadataRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
public class CodeExecutionService {

    @Autowired
    private FileMetadataRepository metadataRepo;

    @Autowired
    private FileSystemClient fileSystemClient;

    @Autowired
    private ExecutorRouterService executorRouterService;

    public String execute(String fileId, String snapshotName) throws Exception {
        Optional<FileMetadata> meta = metadataRepo.findById(fileId);
        if (meta.isEmpty()) throw new RuntimeException("File metadata not found");

        String code = fileSystemClient.getFileContent(snapshotName);

        String lang = getLangFromExtension(meta.get().getFilename());

        return executorRouterService.forwardToExecutor(lang, code);
    }

    private String getLangFromExtension(String filename) {
        if (filename.endsWith(".java")) return "java";
        if (filename.endsWith(".py")) return "python";
        if (filename.endsWith(".c")) return "c";
        if (filename.endsWith(".cpp")) return "cpp";
        if (filename.endsWith(".js")) return "js";
        if (filename.endsWith(".rb")) return "ruby";
        throw new RuntimeException("Unknown extension: " + filename);
    }
}

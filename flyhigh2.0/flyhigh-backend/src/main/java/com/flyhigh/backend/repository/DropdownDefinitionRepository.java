package com.flyhigh.backend.repository;

import com.flyhigh.backend.model.DropdownDefinition;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface DropdownDefinitionRepository extends MongoRepository<DropdownDefinition, String> {
    Optional<DropdownDefinition> findByKey(String key);
    List<DropdownDefinition> findAllByOrderByDisplayOrderAsc();
    List<DropdownDefinition> findByIsSeedDataTrue();
}
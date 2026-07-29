package com.flyhigh.backend.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Document(collection = "dropdown_definitions")
public class DropdownDefinition {

    @Id
    private String id;

    @Indexed(unique = true)
    private String key;

    private String label;
    private String placeholder;
    private Boolean allowCustom = false;
    private Boolean multiSelect = false;
    private String dependsOn;
    private Integer displayOrder = 0;
    private List<DropdownOptionValue> options = new ArrayList<>();
    private Instant createdAt;
    private Instant updatedAt;

    // --- Seed metadata ---
    private Boolean isSeedData = false;
    private String seedSource;

    public DropdownDefinition() {}

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getKey() { return key; }
    public void setKey(String key) { this.key = key; }

    public String getLabel() { return label; }
    public void setLabel(String label) { this.label = label; }

    public String getPlaceholder() { return placeholder; }
    public void setPlaceholder(String placeholder) { this.placeholder = placeholder; }

    public Boolean getAllowCustom() { return allowCustom; }
    public void setAllowCustom(Boolean allowCustom) { this.allowCustom = allowCustom; }

    public Boolean getMultiSelect() { return multiSelect; }
    public void setMultiSelect(Boolean multiSelect) { this.multiSelect = multiSelect; }

    public String getDependsOn() { return dependsOn; }
    public void setDependsOn(String dependsOn) { this.dependsOn = dependsOn; }

    public Integer getDisplayOrder() { return displayOrder; }
    public void setDisplayOrder(Integer displayOrder) { this.displayOrder = displayOrder; }

    public List<DropdownOptionValue> getOptions() { return options; }
    public void setOptions(List<DropdownOptionValue> options) { this.options = options; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }

    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }

    public Boolean getIsSeedData() { return isSeedData; }
    public void setIsSeedData(Boolean isSeedData) { this.isSeedData = isSeedData; }

    public String getSeedSource() { return seedSource; }
    public void setSeedSource(String seedSource) { this.seedSource = seedSource; }
}
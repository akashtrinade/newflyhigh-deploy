package com.flyhigh.backend.dto;

/**
 * Category name with expert count — used on the home page category grid.
 */
public class CategoryCountDto {

    private String name;
    private long expertCount;

    public CategoryCountDto() {}

    public CategoryCountDto(String name, long expertCount) {
        this.name = name;
        this.expertCount = expertCount;
    }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public long getExpertCount() { return expertCount; }
    public void setExpertCount(long expertCount) { this.expertCount = expertCount; }
}

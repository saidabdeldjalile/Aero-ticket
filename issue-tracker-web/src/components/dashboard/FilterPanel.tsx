import React, { useState, useEffect } from "react";
import axios from "../../api/axios";
import { Department, Project } from "../../TicketResponse";


import { TimeRangeFilter } from "../../types/dashboard";

interface FilterPanelProps {
  filters: TimeRangeFilter;
  onFilterChange: (filters: TimeRangeFilter) => void;
  onReset: () => void;
}

const FilterPanel: React.FC<FilterPanelProps> = ({
  filters,
  onFilterChange,
  onReset
}) => {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [filteredProjects, setFilteredProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLists = async () => {
      try {
        setLoading(true);
        const [deptsRes, projsRes] = await Promise.all([
          axios.get('/departments'),
          axios.get('/projects')
        ]);
        // Handle paginated responses - extract content array from Page object
        const deptsData = deptsRes.data?.content || deptsRes.data || [];
        const projsData = projsRes.data?.content || projsRes.data || [];
        const depts = Array.isArray(deptsData) ? deptsData : [];
        const projs = Array.isArray(projsData) ? projsData : [];
        setDepartments(depts);
        setProjects(projs);
      } catch (error) {
        console.error('Error fetching lists:', error);
        setDepartments([]);
        setProjects([]);
      } finally {
        setLoading(false);
      }
    };

    fetchLists();
  }, []);

  // Filter projects when department changes
  useEffect(() => {
    if (filters.departmentId) {
      setFilteredProjects(projects.filter(p => p.departmentId === filters.departmentId));
    } else {
      setFilteredProjects(projects);
    }
  }, [filters.departmentId, projects]);

  const handleDateChange = (field: 'startDate' | 'endDate', value: string) => {
    onFilterChange({
      ...filters,
      [field]: value
    });
  };

  const handleDepartmentChange = (value: string) => {
    onFilterChange({
      ...filters,
      departmentId: value ? parseInt(value) : undefined,
      projectId: undefined, // Reset project when department changes
    });
  };

  const handleProjectChange = (value: string) => {
    onFilterChange({
      ...filters,
      projectId: value ? parseInt(value) : undefined
    });
  };

  return (
    <div className="bg-base-100/80 backdrop-blur-xl rounded-2xl shadow-sm border border-base-300/60 p-6 mb-8">
      <div className="flex flex-col lg:flex-row gap-5 items-end justify-between">
        <div className="flex flex-col sm:flex-row gap-5 items-center flex-1 w-full lg:w-auto">
          <div className="form-control w-full sm:w-auto">
            <label className="label text-xs font-semibold text-base-content/60 uppercase tracking-wider mb-1 px-1 py-0">
              Start Date
            </label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => handleDateChange('startDate', e.target.value)}
              className="input input-bordered bg-base-100 focus:bg-base-100/50 transition-colors w-full sm:w-[150px]"
            />
          </div>

          <div className="form-control w-full sm:w-auto">
            <label className="label text-xs font-semibold text-base-content/60 uppercase tracking-wider mb-1 px-1 py-0">
              End Date
            </label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => handleDateChange('endDate', e.target.value)}
              className="input input-bordered bg-base-100 focus:bg-base-100/50 transition-colors w-full sm:w-[150px]"
            />
          </div>

          <div className="form-control w-full sm:w-auto flex-1 max-w-xs">
            <label className="label text-xs font-semibold text-base-content/60 uppercase tracking-wider mb-1 px-1 py-0">
              Department
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-base-content/40 z-10">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
              </div>
              <select
                value={filters.departmentId || ''}
                onChange={(e) => handleDepartmentChange(e.target.value)}
                className="select select-bordered h-11 pl-10 bg-base-100 focus:bg-base-100/50 transition-colors w-full"
                disabled={loading}
              >
                <option value="">All Departments</option>
                {loading ? (
                  <option disabled>Loading...</option>
                ) : (
                  departments.map((dept) => (
                    <option key={dept.id} value={dept.id.toString()}>
                      {dept.name}
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>

          <div className="form-control w-full sm:w-auto flex-1 max-w-xs">
            <label className="label text-xs font-semibold text-base-content/60 uppercase tracking-wider mb-1 px-1 py-0">
              Project
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-base-content/40 z-10">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>
              </div>
              <select
                value={filters.projectId || ''}
                onChange={(e) => handleProjectChange(e.target.value)}
                className="select select-bordered h-11 pl-10 bg-base-100 focus:bg-base-100/50 transition-colors w-full"
                disabled={loading}
              >
                <option value="">All Projects</option>
                {loading ? (
                  <option disabled>Loading...</option>
                ) : (
                  filteredProjects.map((proj) => (
                    <option key={proj.id} value={proj.id.toString()}>
                      {proj.name}
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>
        </div>

        <div className="flex gap-3 w-full lg:w-auto">
          <button
            onClick={onReset}
            className="btn h-11 btn-ghost border border-base-300 hover:bg-base-200 flex-1 lg:flex-none"
          >
            Reset
          </button>
          <button
            onClick={() => onFilterChange(filters)}
            className="btn h-11 btn-primary shadow-lg shadow-primary/30 hover:shadow-primary/50 flex-1 lg:flex-none transition-all"
          >
            Apply Filters
          </button>
        </div>
      </div>
    </div>
  );
};

export default FilterPanel;
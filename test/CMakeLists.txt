cmake_minimum_required (VERSION 3.6.3)
project (TGV_TEST LANGUAGES CXX)

# Geant4 includes
find_package (Geant4 REQUIRED)
include (${Geant4_USE_FILE})
include_directories (${Geant4_INCLUDE_DIR})

# Build the executables
add_executable (g4togdml "src/g4togdml.cpp")
target_include_directories (g4togdml PRIVATE ${Geant4_INCLUDE_DIRS})
target_compile_definitions (g4togdml PRIVATE
        ${Geant4_DEFINITIONS} "-DG4VIS_USE_OPENGL" "-DG4INTY_USE_QT"
        "-DG4UI_USE_QT" "-DG4VIS_USE_OPENGLQT")
target_link_libraries (g4togdml ${Geant4_LIBRARIES} G4OpenGL)


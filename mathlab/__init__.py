# MathLab module for advanced mathematical operations
# This makes the directory a Python package

from flask import Blueprint
from .mathlab_app import mathlab_bp

# Make the blueprint available at the package level for easy importing
__all__ = ['mathlab_bp']
